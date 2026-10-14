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
        validate(images, false);
    }

    public static void validate(List<ImageAttachment> images, boolean allowPdf) {
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
                if (allowPdf && "application/pdf".equals(image.type())) {
                    String header = new String(bytes, 0, Math.min(bytes.length, 8), java.nio.charset.StandardCharsets.US_ASCII);
                    if (!header.startsWith("%PDF-") || !image.name().toLowerCase(java.util.Locale.ROOT).endsWith(".pdf")) fail();
                    continue;
                }
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
            "Pièces jointes invalides : maximum 5 fichiers, 2 Mo par fichier et 8 Mo au total. Images PNG/JPEG (8192 pixels maximum), PDF dans les tâches et les commentaires.",
            "imageAttachment",
            "invalidimages"
        );
    }
}
