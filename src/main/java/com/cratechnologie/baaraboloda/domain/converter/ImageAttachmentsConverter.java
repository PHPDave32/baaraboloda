package com.cratechnologie.baaraboloda.domain.converter;

import com.cratechnologie.baaraboloda.domain.ImageAttachment;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.List;

@Converter
public class ImageAttachmentsConverter implements AttributeConverter<List<ImageAttachment>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public String convertToDatabaseColumn(List<ImageAttachment> images) {
        if (images == null) return null;
        try {
            return MAPPER.writeValueAsString(images);
        } catch (Exception exception) {
            throw new IllegalArgumentException("Cannot serialize images", exception);
        }
    }

    public List<ImageAttachment> convertToEntityAttribute(String value) {
        if (value == null) return null;
        try {
            return MAPPER.readValue(value, new TypeReference<List<ImageAttachment>>() {});
        } catch (Exception exception) {
            throw new IllegalArgumentException("Cannot read images", exception);
        }
    }
}
