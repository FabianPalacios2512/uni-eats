package com.remington.unieats.marketplace.controller;

import com.remington.unieats.marketplace.service.ImageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 📊 Controlador para verificar el estado del almacenamiento de imágenes
 */
@RestController
@RequestMapping("/api/storage")
public class StorageController {

    @Autowired
    private ImageService imageService;

    /**
     * 📊 Estado del sistema de almacenamiento
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStorageStatus() {
        Map<String, Object> status = new HashMap<>();
        
        status.put("activeStorage", imageService.getActiveStorage());
        status.put("isCloudStorageActive", imageService.isCloudStorageActive());
        status.put("timestamp", java.time.LocalDateTime.now());
        
        if (imageService.isCloudStorageActive()) {
            status.put("message", "✅ Supabase Storage activo - Las imágenes funcionarán en producción");
            status.put("recommendation", "Perfecto para Render");
        } else {
            status.put("message", "⚠️ Almacenamiento local activo - Solo funciona en desarrollo");
            status.put("recommendation", "Configurar Supabase Storage para producción");
        }

        return ResponseEntity.ok(status);
    }
}