package com.buildup.material.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class MaterialRequestStatusAttributeConverter
        implements AttributeConverter<MaterialRequestStatus, String> {

    @Override
    public String convertToDatabaseColumn(MaterialRequestStatus attribute) {
        return attribute == null ? null : attribute.apiValue();
    }

    @Override
    public MaterialRequestStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : MaterialRequestStatus.fromApiValue(dbData);
    }
}
