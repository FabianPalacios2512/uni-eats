package com.remington.unieats.marketplace.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;

/**
 * 🗄️ Servicio para gestionar imágenes en Supabase Storage
 * Implementación simplificada usando HttpClient - GRATIS hasta 1GB
 */
@Service
public class SupabaseStorageService {

    @Value("${supabase.url:}")
    private String supabaseUrl;

    @Value("${supabase.anon.key:}")
    private String supabaseAnonKey;

    @Value("${supabase.storage.bucket:uni-eats-images}")
    private String bucketName;

    @Value("${supabase.storage.enabled:false}")
    private boolean supabaseEnabled;

    private HttpClient httpClient;

    @PostConstruct
    public void init() {
        if (supabaseEnabled && supabaseUrl != null && !supabaseUrl.isEmpty()) {
            this.httpClient = HttpClient.newBuilder()
                .build();
        }
    }

    /**
     * 📤 Subir imagen a Supabase Storage
     */
    public String uploadImage(MultipartFile file, String folder) throws IOException {
        if (!supabaseEnabled) {
            throw new IllegalStateException("Supabase Storage no está configurado");
        }

        try {
            // Generar nombre único
            String fileName = UUID.randomUUID().toString();
            String originalFileName = file.getOriginalFilename();
            String fileExtension = "";
            
            if (originalFileName != null && originalFileName.contains(".")) {
                fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
            }
            
            String uniqueFileName = fileName + fileExtension;
            String objectPath = folder + "/" + uniqueFileName;

            // Crear request para subir archivo
            String uploadUrl = supabaseUrl + "/storage/v1/object/" + bucketName + "/" + objectPath;
            
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(uploadUrl))
                .header("Authorization", "Bearer " + supabaseAnonKey)
                .header("Content-Type", file.getContentType())
                .header("x-upsert", "true") // Permite sobrescribir si existe
                .POST(HttpRequest.BodyPublishers.ofByteArray(file.getBytes()))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200 || response.statusCode() == 201) {
                // Retornar URL pública
                return getPublicUrl(objectPath);
            } else {
                throw new IOException("Error subiendo a Supabase. Status: " + response.statusCode() + 
                                    ", Response: " + response.body());
            }
            
        } catch (Exception e) {
            throw new IOException("Error subiendo imagen a Supabase: " + e.getMessage(), e);
        }
    }

    /**
     * 🗑️ Eliminar imagen de Supabase Storage
     */
    public void deleteImage(String imageUrl) {
        if (!supabaseEnabled) {
            return;
        }

        try {
            if (imageUrl != null && !imageUrl.isEmpty()) {
                // Extraer la ruta del objeto desde la URL
                String objectPath = extractPathFromUrl(imageUrl);
                if (objectPath != null) {
                    String deleteUrl = supabaseUrl + "/storage/v1/object/" + bucketName + "/" + objectPath;
                    
                    HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(deleteUrl))
                        .header("Authorization", "Bearer " + supabaseAnonKey)
                        .DELETE()
                        .build();
                    
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                }
            }
        } catch (Exception e) {
            System.err.println("⚠️ Error eliminando imagen: " + e.getMessage());
        }
    }

    /**
     * 🌐 Obtener URL pública de la imagen
     */
    private String getPublicUrl(String objectPath) {
        return supabaseUrl + "/storage/v1/object/public/" + bucketName + "/" + objectPath;
    }

    /**
     * 🔧 Extraer path desde URL pública
     */
    private String extractPathFromUrl(String imageUrl) {
        try {
            String publicPath = "/storage/v1/object/public/" + bucketName + "/";
            int index = imageUrl.indexOf(publicPath);
            if (index != -1) {
                return imageUrl.substring(index + publicPath.length());
            }
        } catch (Exception e) {
            System.err.println("⚠️ Error extrayendo path de URL: " + e.getMessage());
        }
        return null;
    }

    /**
     * ✅ Verificar si Supabase está habilitado
     */
    public boolean isEnabled() {
        return supabaseEnabled;
    }

    /**
     * 🔄 Migrar imagen desde local a Supabase
     */
    public String migrateLocalImageToSupabase(String localPath, String folder) {
        // Esta función se puede usar para migrar imágenes existentes
        // Por ahora retorna la misma URL para mantener compatibilidad
        return localPath;
    }
}