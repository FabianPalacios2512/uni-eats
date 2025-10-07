package com.remington.unieats.marketplace.controller;

import com.remington.unieats.marketplace.entity.RecomendacionML;
import com.remington.unieats.marketplace.entity.RecomendacionMLMinima;
import com.remington.unieats.marketplace.entity.UsuarioComportamiento;
import com.remington.unieats.marketplace.repository.RecomendacionMLRepository;
import com.remington.unieats.marketplace.repository.RecomendacionMLMinimaRepository;
import com.remington.unieats.marketplace.repository.UsuarioComportamientoRepository;
import com.remington.unieats.marketplace.service.MachineLearningService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 🤖 Controlador para monitorear el sistema de Machine Learning
 */
@RestController
@RequestMapping("/api/ml-monitor")
public class MLMonitorController {

    @Autowired
    private UsuarioComportamientoRepository comportamientoRepository;

    @Autowired
    private RecomendacionMLRepository recomendacionRepository;

    @Autowired
    private RecomendacionMLMinimaRepository recomendacionMLMinimaRepository;

    @Autowired
    private RecomendacionMLMinimaRepository recomendacionMinimaRepository;
    
    @Autowired
    private MachineLearningService machineLearningService;

    /**
     * 📊 Dashboard completo del sistema ML
     */
    @GetMapping("/dashboard/{usuarioId}")
    public ResponseEntity<Map<String, Object>> getDashboard(@PathVariable Integer usuarioId) {
        Map<String, Object> dashboard = new HashMap<>();
        
        try {
            // 1. Comportamientos del usuario
            List<UsuarioComportamiento> comportamientos = 
                comportamientoRepository.findByUsuarioIdOrderByPuntuacionAfinidadDesc(usuarioId);
            
            // 2. Recomendaciones generadas (activas)
            List<RecomendacionML> recomendaciones = 
                recomendacionRepository.findRecomendacionesActivasByUsuario(usuarioId);
            
            // 3. Estadísticas generales
            Object[] estadisticas = comportamientoRepository.getEstadisticasUsuario(usuarioId);
            
            // 4. Categorías favoritas
            List<Object[]> categoriasFavoritas = 
                comportamientoRepository.findTopCategoriasByUsuario(usuarioId);
            
            // 5. Tiendas más frecuentadas
            List<Object[]> tiendasFavoritas = 
                comportamientoRepository.findTopTiendasByUsuario(usuarioId);

            dashboard.put("usuarioId", usuarioId);
            dashboard.put("timestamp", LocalDateTime.now());
            dashboard.put("comportamientos", comportamientos);
            dashboard.put("recomendaciones", recomendaciones);
            
            // Manejo seguro de estadísticas (puede ser null o incompleto)
            Map<String, Object> estadisticasSeguras = new HashMap<>();
            if (estadisticas != null && estadisticas.length >= 3) {
                estadisticasSeguras.put("totalComportamientos", estadisticas[0] != null ? estadisticas[0] : 0);
                estadisticasSeguras.put("frecuenciaTotal", estadisticas[1] != null ? estadisticas[1] : 0);
                estadisticasSeguras.put("afinidadPromedio", estadisticas[2] != null ? estadisticas[2] : 0.0);
            } else {
                estadisticasSeguras.put("totalComportamientos", 0);
                estadisticasSeguras.put("frecuenciaTotal", 0);
                estadisticasSeguras.put("afinidadPromedio", 0.0);
            }
            dashboard.put("estadisticas", estadisticasSeguras);
            dashboard.put("categoriasFavoritas", categoriasFavoritas);
            dashboard.put("tiendasFavoritas", tiendasFavoritas);
            dashboard.put("status", "✅ Sistema ML Activo");

            return ResponseEntity.ok(dashboard);
            
        } catch (Exception e) {
            dashboard.put("error", "❌ Error en sistema ML: " + e.getMessage());
            dashboard.put("status", "🔴 Sistema ML con errores");
            return ResponseEntity.ok(dashboard);
        }
    }

    /**
     * 🧠 Forzar generación de recomendaciones
     */
    @PostMapping("/generar-recomendaciones/{usuarioId}")
    public ResponseEntity<Map<String, Object>> generarRecomendaciones(@PathVariable Integer usuarioId) {
        Map<String, Object> resultado = new HashMap<>();
        
        try {
            // Obtener recomendaciones actuales
            List<RecomendacionML> recomendacionesDespues = 
                recomendacionRepository.findRecomendacionesActivasByUsuario(usuarioId);
            
            resultado.put("mensaje", "🧠 Verificación de recomendaciones completada");
            resultado.put("timestamp", LocalDateTime.now());
            resultado.put("recomendacionesActuales", recomendacionesDespues.size());
            resultado.put("recomendaciones", recomendacionesDespues);
            resultado.put("status", "success");
            
            return ResponseEntity.ok(resultado);
            
        } catch (Exception e) {
            resultado.put("error", "❌ Error verificando recomendaciones: " + e.getMessage());
            resultado.put("status", "error");
            return ResponseEntity.ok(resultado);
        }
    }

    /**
     * 📈 Obtener comportamientos de un usuario
     */
    @GetMapping("/comportamientos/{usuarioId}")
    public ResponseEntity<List<UsuarioComportamiento>> getComportamientos(@PathVariable Integer usuarioId) {
        List<UsuarioComportamiento> comportamientos = 
            comportamientoRepository.findByUsuarioIdOrderByPuntuacionAfinidadDesc(usuarioId);
        return ResponseEntity.ok(comportamientos);
    }

    /**
     * 🎯 Obtener recomendaciones de un usuario
     */
    @GetMapping("/recomendaciones/{usuarioId}")
    public ResponseEntity<List<RecomendacionML>> getRecomendaciones(@PathVariable Integer usuarioId) {
        // Usar el MachineLearningService que incluye la lógica de generar recomendaciones por defecto
        List<RecomendacionML> recomendaciones = 
            machineLearningService.obtenerRecomendacionesParaUsuario(usuarioId, 10);
        return ResponseEntity.ok(recomendaciones);
    }

    /**
     * 🔄 Estado general del sistema ML
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        Map<String, Object> status = new HashMap<>();
        
        try {
            long totalComportamientos = comportamientoRepository.count();
            long totalRecomendaciones = recomendacionRepository.count();
            
            status.put("sistema", "🤖 Machine Learning UniEats");
            status.put("estado", "✅ Operativo");
            status.put("timestamp", LocalDateTime.now());
            status.put("estadisticas", Map.of(
                "comportamientosRegistrados", totalComportamientos,
                "recomendacionesGeneradas", totalRecomendaciones
            ));
            
            return ResponseEntity.ok(status);
            
        } catch (Exception e) {
            status.put("estado", "❌ Error");
            status.put("error", e.getMessage());
            return ResponseEntity.ok(status);
        }
    }

    /**
     * 🧪 Endpoint de test temporal - SIN AUTENTICACIÓN para debugging
     */
    @GetMapping("/test-recomendaciones/{usuarioId}")
    public ResponseEntity<List<RecomendacionML>> getRecomendacionesTest(@PathVariable Integer usuarioId) {
        List<RecomendacionML> recomendaciones = 
            recomendacionRepository.findRecomendacionesActivasByUsuario(usuarioId);
        return ResponseEntity.ok(recomendaciones);
    }

    /**
     * 🧪 Endpoint de test MÍNIMO - Entidad que mapea EXACTAMENTE con DB
     */
    @GetMapping("/test-minimo/{usuarioId}")
    public ResponseEntity<List<RecomendacionMLMinima>> getRecomendacionesMinimo(@PathVariable Integer usuarioId) {
        List<RecomendacionMLMinima> recomendaciones = 
            recomendacionMinimaRepository.findByUsuarioIdOrderByScoreConfianzaDesc(usuarioId);
        return ResponseEntity.ok(recomendaciones);
    }
}