package com.cratechnologie.baaraboloda.web.rest;

import static org.assertj.core.api.Assertions.*;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.file.Path;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

class UserPhotoResourceTest {

    @TempDir
    Path directory;

    @Test
    void storesNormalizedImageAndReadsItBack() throws Exception {
        var resource = new UserPhotoResource(directory.toString());
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(600, 400, BufferedImage.TYPE_INT_RGB), "jpeg", output);
        var result = resource.upload(new MockMultipartFile("file", "../../photo.jpg", "image/jpeg", output.toByteArray()));
        String url = result.getBody().get("imageUrl");
        byte[] bytes = resource.get(url.substring(url.lastIndexOf('/') + 1)).getBody();
        var image = ImageIO.read(new ByteArrayInputStream(bytes));
        assertThat(image.getWidth()).isEqualTo(256);
        assertThat(image.getHeight()).isEqualTo(256);
        assertThat(directory.toFile().list()).hasSize(1);
    }

    @Test
    void rejectsInvalidAndOversizedUploads() {
        var resource = new UserPhotoResource(directory.toString());
        for (byte[] bytes : new byte[][] { new byte[0], "<svg/>".getBytes(), new byte[2 * 1024 * 1024 + 1] }) {
            assertThatThrownBy(() -> resource.upload(new MockMultipartFile("file", "photo.png", "image/png", bytes))).isInstanceOf(
                ResponseStatusException.class
            );
        }
        assertThat(directory.toFile().list()).isEmpty();
    }

    @Test
    void rejectsTraversalAndMissingImages() {
        var resource = new UserPhotoResource(directory.toString());
        assertThatThrownBy(() -> resource.get("../../secret")).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> resource.get("00000000-0000-0000-0000-000000000000")).isInstanceOf(ResponseStatusException.class);
    }
}
