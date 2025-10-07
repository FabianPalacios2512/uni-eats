package com.remington.unieats.marketplace.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;

/**
 * 🔄 Servicio híbrido para gestión de imágenes
 * Utiliza Supabase Storage si está disponible, sino LocalImageService como fallback
 */
@Service
public class ImageService {

    private static final Logger logger = LoggerFactory.getLogger(ImageService.class);

    @Autowired
    private SupabaseStorageService supabaseStorageService;

    @Autowired
    private LocalImageService localImageService;

    /**
     * 📤 Subir imagen (Supabase primero, local como fallback)
     */
    public String uploadImage(MultipartFile file, String folder) throws IOException {
        try {
            // Intentar subir a Supabase primero
            if (supabaseStorageService.isEnabled()) {
                logger.info("🗄️ Subiendo imagen a Supabase Storage: {}", file.getOriginalFilename());
                return supabaseStorageService.uploadImage(file, folder);
            } else {
                logger.info("📂 Supabase no disponible, usando almacenamiento local: {}", file.getOriginalFilename());
                return localImageService.uploadImage(file, folder);
            }
        } catch (Exception e) {
            // Si Supabase falla, usar almacenamiento local como fallback
            logger.warn("⚠️ Error en Supabase, usando almacenamiento local como fallback: {}", e.getMessage());
            return localImageService.uploadImage(file, folder);
        }
    }

    /**
     * 🗑️ Eliminar imagen
     */
    public void deleteImage(String imageUrl) {
        // Intentar primero con Supabase
        if (supabaseStorageService.isEnabled()) {
            try {
                supabaseStorageService.deleteImage(imageUrl);
                return;
            } catch (Exception e) {
                logger.warn("Error eliminando imagen de Supabase: {}", e.getMessage());
            }
        }
        
        // Fallback a almacenamiento local
        localImageService.deleteImage(imageUrl);
    }

    /**
     * 📊 Obtener el tipo de almacenamiento activo
     */
    public String getActiveStorage() {
        return supabaseStorageService.isEnabled() ? "Supabase Storage" : "Local Storage";
    }

    /**
     * 📊 Verificar si el almacenamiento en la nube está activo
     */
    public boolean isCloudStorageActive() {
        return supabaseStorageService.isEnabled();
    }
}