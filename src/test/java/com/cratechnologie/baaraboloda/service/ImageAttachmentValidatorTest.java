package com.cratechnologie.baaraboloda.service;

import static org.assertj.core.api.Assertions.*;

import com.cratechnologie.baaraboloda.domain.ImageAttachment;
import com.cratechnologie.baaraboloda.domain.converter.ImageAttachmentsConverter;
import com.cratechnologie.baaraboloda.web.rest.errors.BadRequestAlertException;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;

class ImageAttachmentValidatorTest {

    private final ImageAttachment png = new ImageAttachment(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9ioAAAAASUVORK5CYII=",
        "image/png",
        "capture.png"
    );

    @Test
    void acceptsPdfInCommentsAndPreservesMixedAttachments() {
        var pdf = new ImageAttachment(
            java.util.Base64.getEncoder().encodeToString("%PDF-1.4\n%%EOF".getBytes(java.nio.charset.StandardCharsets.US_ASCII)),
            "application/pdf",
            "document.pdf"
        );
        var attachments = List.of(png, pdf);
        assertThatCode(() -> ImageAttachmentValidator.validate(attachments, true)).doesNotThrowAnyException();
        var converter = new ImageAttachmentsConverter();
        assertThat(converter.convertToEntityAttribute(converter.convertToDatabaseColumn(attachments))).isEqualTo(attachments);
        assertThatThrownBy(() -> ImageAttachmentValidator.validate(attachments)).isInstanceOf(BadRequestAlertException.class);
    }

    @Test
    void rejectsFakeAndOversizedPdfs() {
        var fake = new ImageAttachment(png.data(), "application/pdf", "fake.pdf");
        assertThatThrownBy(() -> ImageAttachmentValidator.validate(List.of(fake), true)).isInstanceOf(BadRequestAlertException.class);
        var oversized = new ImageAttachment(
            java.util.Base64.getEncoder().encodeToString(new byte[2097153]),
            "application/pdf",
            "large.pdf"
        );
        assertThatThrownBy(() -> ImageAttachmentValidator.validate(List.of(oversized), true)).isInstanceOf(BadRequestAlertException.class);
    }

    @Test
    void acceptsSeveralValidImagesAndPreservesThemInStorage() {
        List<ImageAttachment> images = List.of(png, png);
        assertThatCode(() -> ImageAttachmentValidator.validate(images)).doesNotThrowAnyException();
        var converter = new ImageAttachmentsConverter();
        assertThat(converter.convertToEntityAttribute(converter.convertToDatabaseColumn(images))).isEqualTo(images);
    }

    @Test
    void rejectsMoreThanFiveImages() {
        assertThatThrownBy(() -> ImageAttachmentValidator.validate(Collections.nCopies(6, png))).isInstanceOf(
            BadRequestAlertException.class
        );
    }

    @Test
    void rejectsInvalidContentAndForgedType() {
        assertThatThrownBy(() ->
            ImageAttachmentValidator.validate(List.of(new ImageAttachment("not base64", "image/png", "x")))
        ).isInstanceOf(BadRequestAlertException.class);
        assertThatThrownBy(() ->
            ImageAttachmentValidator.validate(List.of(new ImageAttachment(png.data(), "image/jpeg", "x")))
        ).isInstanceOf(BadRequestAlertException.class);
    }
}
