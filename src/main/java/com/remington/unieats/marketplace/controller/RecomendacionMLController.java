package com.remington.unieats.marketplace.controller;

import com.remington.unieats.marketplace.entity.RecomendacionML;
import com.remington.unieats.marketplace.service.MachineLearningService;
import com.remington.unieats.marketplace.model.entity.Usuario;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * 🎯 REST API para recomendaciones ML personalizadas
 * Endpoint: /api/recomendaciones/{usuarioId}
 */
@RestController
@RequestMapping("/api/recomendaciones")
@CrossOrigin(origins = "*")
public class RecomendacionMLController {
    
    private static final Logger logger = LoggerFactory.getLogger(RecomendacionMLController.class);
    
    @Autowired
    private MachineLearningService machineLearningService;

    /**
     * 🎯 GET /api/recomendaciones/{usuarioId}
     * Obtener recomendaciones personalizadas para un usuario
     */
    @GetMapping("/{usuarioId}")
    public ResponseEntity<Map<String, Object>> obtenerRecomendacionesUsuario(
            @PathVariable Integer usuarioId,
            @RequestParam(defaultValue = "10") int limite,
            @AuthenticationPrincipal Usuario usuarioAutenticado) {
        
        try {
            // Verificar autorización (usuario solo puede ver sus propias recomendaciones)
            if (usuarioAutenticado == null || !usuarioAutenticado.getId().equals(usuarioId)) {
                logger.warn("🚫 Acceso no autorizado a recomendaciones. Usuario autenticado: {}, Usuario solicitado: {}", 
                           usuarioAutenticado != null ? usuarioAutenticado.getId() : "null", usuarioId);
                return ResponseEntity.status(403).body(Map.of(
                    "error", "No autorizado para ver estas recomendaciones",
                    "codigo", "ACCESO_DENEGADO"
                ));
            }

            // Obtener recomendaciones ML
            List<RecomendacionML> recomendaciones = machineLearningService
                .obtenerRecomendacionesParaUsuario(usuarioId, limite);

            // Crear respuesta estructurada
            Map<String, Object> respuesta = new HashMap<>();
            respuesta.put("usuarioId", usuarioId);
            respuesta.put("totalRecomendaciones", recomendaciones.size());
            respuesta.put("recomendaciones", recomendaciones);
            respuesta.put("timestamp", java.time.LocalDateTime.now());
            
            // Estadísticas por tipo de recomendación
            Map<String, Long> estadisticasPorTipo = recomendaciones.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                    r -> r.getTipoRecomendacion().name(),
                    java.util.stream.Collectors.counting()
                ));
            respuesta.put("estadisticasPorTipo", estadisticasPorTipo);

            // Estadísticas por algoritmo ML - Comentado temporalmente
            // Map<String, Long> estadisticasPorAlgoritmo = recomendaciones.stream()
            //     .collect(java.util.stream.Collectors.groupingBy(
            //         r -> r.getAlgoritmoUsado().name(),
            //         java.util.stream.Collectors.counting()
            //     ));
            // respuesta.put("estadisticasPorAlgoritmo", estadisticasPorAlgoritmo);

            logger.info("✅ Enviadas {} recomendaciones ML a usuario {}", recomendaciones.size(), usuarioId);
            
            return ResponseEntity.ok(respuesta);

        } catch (Exception e) {
            logger.error("❌ Error al obtener recomendaciones para usuario {}: {}", usuarioId, e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                "error", "Error interno al generar recomendaciones",
                "codigo", "ERROR_INTERNO",
                "mensaje", e.getMessage()
            ));
        }
    }

    /**
     * 👁️ POST /api/recomendaciones/{recomendacionId}/mostrar
     * Marcar recomendación como mostrada (para estadísticas ML)
     */
    @PostMapping("/{recomendacionId}/mostrar")
    public ResponseEntity<Map<String, Object>> marcarComoMostrada(
            @PathVariable Long recomendacionId,
            @AuthenticationPrincipal Usuario usuarioAutenticado) {
        
        try {
            if (usuarioAutenticado == null) {
                return ResponseEntity.status(401).body(Map.of(
                    "error", "Usuario no autenticado",
                    "codigo", "NO_AUTENTICADO"
                ));
            }

            machineLearningService.marcarRecomendacionComoMostrada(recomendacionId);
            
            logger.info("👁️ Recomendación {} marcada como mostrada por usuario {}", 
                       recomendacionId, usuarioAutenticado.getId());

            return ResponseEntity.ok(Map.of(
                "mensaje", "Recomendación marcada como mostrada",
                "recomendacionId", recomendacionId,
                "timestamp", java.time.LocalDateTime.now()
            ));

        } catch (Exception e) {
            logger.error("❌ Error al marcar recomendación {} como mostrada: {}", recomendacionId, e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                "error", "Error al actualizar estado de recomendación",
                "codigo", "ERROR_INTERNO"
            ));
        }
    }

    /**
     * ✅ POST /api/recomendaciones/{recomendacionId}/aceptar
     * Marcar recomendación como aceptada (usuario hizo clic/compró)
     */
    @PostMapping("/{recomendacionId}/aceptar")
    public ResponseEntity<Map<String, Object>> marcarComoAceptada(
            @PathVariable Long recomendacionId,
            @AuthenticationPrincipal Usuario usuarioAutenticado) {
        
        try {
            if (usuarioAutenticado == null) {
                return ResponseEntity.status(401).body(Map.of(
                    "error", "Usuario no autenticado",
                    "codigo", "NO_AUTENTICADO"
                ));
            }

            machineLearningService.marcarRecomendacionComoAceptada(recomendacionId);
            
            logger.info("✅ Recomendación {} marcada como aceptada por usuario {}", 
                       recomendacionId, usuarioAutenticado.getId());

            return ResponseEntity.ok(Map.of(
                "mensaje", "Recomendación marcada como aceptada",
                "recomendacionId", recomendacionId,
                "timestamp", java.time.LocalDateTime.now()
            ));

        } catch (Exception e) {
            logger.error("❌ Error al marcar recomendación {} como aceptada: {}", recomendacionId, e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                "error", "Error al actualizar estado de recomendación",
                "codigo", "ERROR_INTERNO"
            ));
        }
    }

    /**
     * 🔄 POST /api/recomendaciones/{usuarioId}/regenerar
     * Regenerar recomendaciones ML para un usuario
     */
    @PostMapping("/{usuarioId}/regenerar")
    public ResponseEntity<Map<String, Object>> regenerarRecomendaciones(
            @PathVariable Integer usuarioId,
            @AuthenticationPrincipal Usuario usuarioAutenticado) {
        
        try {
            // Verificar autorización
            if (usuarioAutenticado == null || !usuarioAutenticado.getId().equals(usuarioId)) {
                return ResponseEntity.status(403).body(Map.of(
                    "error", "No autorizado para regenerar estas recomendaciones",
                    "codigo", "ACCESO_DENEGADO"
                ));
            }

            // Regenerar recomendaciones ML
            machineLearningService.generarRecomendacionesParaUsuario(usuarioId);
            
            // Obtener las nuevas recomendaciones
            List<RecomendacionML> nuevasRecomendaciones = machineLearningService
                .obtenerRecomendacionesParaUsuario(usuarioId, 10);

            logger.info("🔄 Regeneradas {} recomendaciones ML para usuario {}", 
                       nuevasRecomendaciones.size(), usuarioId);

            return ResponseEntity.ok(Map.of(
                "mensaje", "Recomendaciones regeneradas exitosamente",
                "usuarioId", usuarioId,
                "totalNuevasRecomendaciones", nuevasRecomendaciones.size(),
                "nuevasRecomendaciones", nuevasRecomendaciones,
                "timestamp", java.time.LocalDateTime.now()
            ));

        } catch (Exception e) {
            logger.error("❌ Error al regenerar recomendaciones para usuario {}: {}", usuarioId, e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                "error", "Error al regenerar recomendaciones",
                "codigo", "ERROR_INTERNO",
                "mensaje", e.getMessage()
            ));
        }
    }

    /**
     * 📊 GET /api/recomendaciones/{usuarioId}/estadisticas
     * Obtener estadísticas de efectividad de recomendaciones ML
     */
    @GetMapping("/{usuarioId}/estadisticas")
    public ResponseEntity<Map<String, Object>> obtenerEstadisticas(
            @PathVariable Integer usuarioId,
            @AuthenticationPrincipal Usuario usuarioAutenticado) {
        
        try {
            // Verificar autorización
            if (usuarioAutenticado == null || !usuarioAutenticado.getId().equals(usuarioId)) {
                return ResponseEntity.status(403).body(Map.of(
                    "error", "No autorizado para ver estas estadísticas",
                    "codigo", "ACCESO_DENEGADO"
                ));
            }

            // TODO: Implementar estadísticas detalladas desde el repository
            Map<String, Object> estadisticas = new HashMap<>();
            estadisticas.put("usuarioId", usuarioId);
            estadisticas.put("mensaje", "Estadísticas ML en desarrollo");
            estadisticas.put("timestamp", java.time.LocalDateTime.now());

            return ResponseEntity.ok(estadisticas);

        } catch (Exception e) {
            logger.error("❌ Error al obtener estadísticas para usuario {}: {}", usuarioId, e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                "error", "Error al obtener estadísticas",
                "codigo", "ERROR_INTERNO"
            ));
        }
    }

    /**
     * 🧠 GET /api/recomendaciones/health
     * Health check del sistema ML
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        try {
            Map<String, Object> health = new HashMap<>();
            health.put("status", "OK");
            health.put("servicio", "Sistema ML de Recomendaciones");
            health.put("version", "1.0");
            health.put("timestamp", java.time.LocalDateTime.now());
            health.put("algoritmos", List.of(
                "CONTENT_BASED_FILTERING",
                "COLLABORATIVE_FILTERING", 
                "AFFINITY_SCORING",
                "FREQUENCY_BASED",
                "HYBRID_APPROACH"
            ));

            return ResponseEntity.ok(health);

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "status", "ERROR",
                "mensaje", e.getMessage()
            ));
        }
    }
}