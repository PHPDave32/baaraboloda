package com.cratechnologie.baaraboloda.service;

import com.cratechnologie.baaraboloda.domain.ImageAttachment;
import com.cratechnologie.baaraboloda.web.rest.errors.BadRequestAlertException;
import java.io.ByteArrayInputStream;
import java.util.Base64;
import java.util.List;
import javax.imageio.ImageIO;

public final class ImageAttachmentValidator {

    private ImageAttachmentValidator() {}

    public static void validate(List<ImageAttachment> images) {
        if (images == null) return;
        if (images.size() > 5) fail();
        long total = 0;
        for (ImageAttachment image : images) {
            if (
                image == null ||
                image.data() == null ||
                image.data().length() > 2796204 ||
                image.name() == null ||
                image.name().length() > 255
            ) fail();
            try {
                byte[] bytes = Base64.getDecoder().decode(image.data());
                total += bytes.length;
                if (bytes.length == 0 || bytes.length > 2097152 || total > 8388608) fail();
                try (var stream = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                    var readers = ImageIO.getImageReaders(stream);
                    if (!readers.hasNext()) fail();
                    var reader = readers.next();
                    try {
                        reader.setInput(stream);
                        String format = reader.getFormatName();
                        String type = "PNG".equalsIgnoreCase(format) ? "image/png" : "JPEG".equalsIgnoreCase(format) ? "image/jpeg" : "";
                        if (!type.equals(image.type()) || type.isEmpty() || reader.getWidth(0) > 8192 || reader.getHeight(0) > 8192) fail();
                    } finally {
                        reader.dispose();
                    }
                }
            } catch (java.io.IOException | IllegalArgumentException exception) {
                fail();
            }
        }
    }

    private static void fail() {
        throw new BadRequestAlertException(
            "Maximum 5 images PNG/JPEG, 2 Mo par image et 8 Mo au total (8192 pixels maximum).",
            "imageAttachment",
            "invalidimages"
        );
    }
}
