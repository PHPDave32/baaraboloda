package com.cratechnologie.baaraboloda.web.rest;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import javax.imageio.ImageIO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/branding")
public class BrandingResource {

    private final Path logoFile;

    public BrandingResource(@Value("${storage.branding-directory:./.data}") String directory) {
        this.logoFile = Path.of(directory).toAbsolutePath().normalize().resolve("logo.png");
    }

    public record Branding(String logoUrl) {}

    /** Public — tells the frontend whether a custom logo exists. */
    @GetMapping
    public ResponseEntity<Branding> branding() {
        boolean exists = Files.isRegularFile(logoFile);
        return ResponseEntity.ok(new Branding(exists ? "/api/branding/logo" : null));
    }

    /** Public — serves the custom logo file. */
    @GetMapping("/logo")
    public ResponseEntity<byte[]> logo() throws IOException {
        if (!Files.isRegularFile(logoFile)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return ResponseEntity.ok()
            .contentType(MediaType.IMAGE_PNG)
            .cacheControl(CacheControl.noStore())
            .header("X-Content-Type-Options", "nosniff")
            .body(Files.readAllBytes(logoFile));
    }

    /** Super-admin only — upload a new logo. */
    @PostMapping(value = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> upload(@RequestParam MultipartFile file) throws IOException {
        if (file.isEmpty() || file.getSize() > 2 * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Logo limité à 2 Mo.");
        }
        byte[] bytes = validate(file.getBytes());
        Files.createDirectories(logoFile.getParent());
        // Write atomically via a temp file to avoid serving a half-written logo.
        Path tmp = logoFile.resolveSibling("logo.tmp.png");
        Files.write(tmp, bytes);
        Files.move(tmp, logoFile, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        return ResponseEntity.ok(Map.of("logoUrl", (Object) "/api/branding/logo"));
    }

    /** Super-admin only — remove the custom logo (reverts to default). */
    @DeleteMapping("/logo")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public ResponseEntity<Void> remove() throws IOException {
        Files.deleteIfExists(logoFile);
        return ResponseEntity.noContent().build();
    }

    private byte[] validate(byte[] bytes) throws IOException {
        try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalidLogo();
            var reader = readers.next();
            try {
                reader.setInput(input);
                String format = reader.getFormatName();
                if (
                    (!format.equalsIgnoreCase("png") && !format.equalsIgnoreCase("jpeg")) ||
                    reader.getWidth(0) > 4096 ||
                    reader.getHeight(0) > 4096
                ) {
                    throw invalidLogo();
                }
                // Re-encode as PNG so we always serve a consistent format.
                BufferedImage img = reader.read(0);
                var out = new ByteArrayOutputStream();
                ImageIO.write(img, "png", out);
                return out.toByteArray();
            } finally {
                reader.dispose();
            }
        } catch (javax.imageio.IIOException e) {
            throw invalidLogo();
        }
    }

    private ResponseStatusException invalidLogo() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Utilisez une image JPEG ou PNG de 4096 × 4096 pixels maximum.");
    }
}
