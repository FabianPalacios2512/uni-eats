package com.remington.unieats.marketplace.controller;

import com.remington.unieats.marketplace.model.entity.Usuario;
import com.remington.unieats.marketplace.model.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 🔐 Controlador para autenticación y manejo de sesión de usuarios
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {
    
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    
    @Autowired
    private UsuarioRepository usuarioRepository;
    
    /**
     * 👤 Obtener información del usuario actual logueado
     */
    @GetMapping("/current-user")
    public ResponseEntity<?> getCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            
            if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
                logger.debug("🔍 No hay usuario autenticado");
                return ResponseEntity.ok(Map.of("authenticated", false));
            }
            
            String email = auth.getName();
            logger.debug("🔍 Buscando usuario autenticado: {}", email);
            
            Usuario usuario = usuarioRepository.findByCorreo(email).orElse(null);
            
            if (usuario == null) {
                logger.warn("⚠️ Usuario autenticado no encontrado en BD: {}", email);
                return ResponseEntity.ok(Map.of("authenticated", false));
            }
            
            logger.info("✅ Usuario autenticado encontrado: {} (ID: {})", email, usuario.getId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("authenticated", true);
            response.put("id", usuario.getId());
            response.put("email", usuario.getCorreo());
            response.put("nombre", usuario.getNombre());
            response.put("apellido", usuario.getApellido());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("❌ Error obteniendo usuario actual: {}", e.getMessage());
            return ResponseEntity.ok(Map.of(
                "authenticated", false, 
                "error", e.getMessage()
            ));
        }
    }
    
    /**
     * 🔍 Verificar estado de autenticación
     */
    @GetMapping("/status")
    public ResponseEntity<?> getAuthStatus() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isAuthenticated = auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal());
            
            Map<String, Object> status = new HashMap<>();
            status.put("authenticated", isAuthenticated);
            
            if (isAuthenticated) {
                status.put("username", auth.getName());
                status.put("authorities", auth.getAuthorities());
            }
            
            return ResponseEntity.ok(status);
            
        } catch (Exception e) {
            logger.error("❌ Error verificando estado de autenticación: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("authenticated", false));
        }
    }
}