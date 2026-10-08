package com.cratechnologie.baaraboloda.web.rest;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/user-photos")
public class UserPhotoResource {

    private final Path directory;

    public UserPhotoResource(@Value("${storage.user-photos-directory:./.data/user-photos}") String directory) {
        this.directory = Path.of(directory).toAbsolutePath().normalize();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> upload(@RequestParam MultipartFile file) throws IOException {
        if (file.isEmpty() || file.getSize() > 2 * 1024 * 1024) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Photo limitée à 2 Mo."
        );
        byte[] bytes = normalize(file.getBytes());
        Files.createDirectories(directory);
        String id = UUID.randomUUID().toString();
        Files.write(directory.resolve(id + ".png"), bytes, java.nio.file.StandardOpenOption.CREATE_NEW);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("imageUrl", "/api/user-photos/" + id));
    }

    @GetMapping("/{id}")
    public ResponseEntity<byte[]> get(@PathVariable String id) throws IOException {
        if (!id.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")) throw new ResponseStatusException(
            HttpStatus.NOT_FOUND
        );
        Path file = directory.resolve(id + ".png");
        if (!Files.isRegularFile(file)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return ResponseEntity.ok()
            .contentType(MediaType.IMAGE_PNG)
            .cacheControl(CacheControl.noStore())
            .header("X-Content-Type-Options", "nosniff")
            .body(Files.readAllBytes(file));
    }

    private byte[] normalize(byte[] bytes) throws IOException {
        try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalidPhoto();
            var reader = readers.next();
            try {
                reader.setInput(input);
                String format = reader.getFormatName();
                if (
                    (!format.equalsIgnoreCase("png") && !format.equalsIgnoreCase("jpeg")) ||
                    reader.getWidth(0) > 4096 ||
                    reader.getHeight(0) > 4096
                ) throw invalidPhoto();
                BufferedImage source = reader.read(0);
                int side = Math.min(source.getWidth(), source.getHeight());
                BufferedImage resized = new BufferedImage(256, 256, BufferedImage.TYPE_INT_ARGB);
                var graphics = resized.createGraphics();
                try {
                    graphics.setRenderingHint(
                        java.awt.RenderingHints.KEY_INTERPOLATION,
                        java.awt.RenderingHints.VALUE_INTERPOLATION_BICUBIC
                    );
                    int x = (source.getWidth() - side) / 2;
                    int y = (source.getHeight() - side) / 2;
                    graphics.drawImage(source, 0, 0, 256, 256, x, y, x + side, y + side, null);
                } finally {
                    graphics.dispose();
                }
                var output = new ByteArrayOutputStream();
                ImageIO.write(resized, "png", output);
                return output.toByteArray();
            } finally {
                reader.dispose();
            }
        } catch (javax.imageio.IIOException exception) {
            throw invalidPhoto();
        }
    }

    private ResponseStatusException invalidPhoto() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Utilisez une image JPEG ou PNG de 4096 × 4096 pixels maximum.");
    }
}
