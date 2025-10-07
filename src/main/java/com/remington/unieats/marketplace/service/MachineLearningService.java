package com.remington.unieats.marketplace.service;

import com.remington.unieats.marketplace.entity.RecomendacionML;
import com.remington.unieats.marketplace.entity.UsuarioComportamiento;
import com.remington.unieats.marketplace.model.entity.Pedido;
import com.remington.unieats.marketplace.model.entity.DetallePedido;
import com.remington.unieats.marketplace.model.entity.Producto;
import com.remington.unieats.marketplace.repository.UsuarioComportamientoRepository;
import com.remington.unieats.marketplace.repository.RecomendacionMLRepository;
import com.remington.unieats.marketplace.model.repository.ProductoRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.ArrayList;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 🧠 Servicio principal de Machine Learning para recomendaciones personalizadas
 * Implementa Content-Based Filtering y Collaborative Filtering
 */
@Service
@Transactional
public class MachineLearningService {
    
    private static final Logger logger = LoggerFactory.getLogger(MachineLearningService.class);
    
    @Autowired
    private UsuarioComportamientoRepository comportamientoRepository;
    
    @Autowired
    private RecomendacionMLRepository recomendacionRepository;
    
    @Autowired
    private ProductoRepository productoRepository;

    /**
     * 📊 Registrar comportamiento de compra (llamado después de cada pedido)
     */
    public void registrarComportamientoCompra(Pedido pedido) {
        Integer usuarioId = pedido.getComprador().getId();
        
        for (DetallePedido detalle : pedido.getDetalles()) {
            Integer productoId = detalle.getProducto().getId();
            String nombreProducto = detalle.getProducto().getNombre();
            String categoriaProducto = detalle.getProducto().getClasificacion().name();
            Integer tiendaId = detalle.getProducto().getTienda().getId();
            String nombreTienda = detalle.getProducto().getTienda().getNombre();
            BigDecimal totalGastado = detalle.getPrecioUnitario().multiply(BigDecimal.valueOf(detalle.getCantidad()));
            BigDecimal cantidad = BigDecimal.valueOf(detalle.getCantidad());
            
            // Buscar comportamiento existente
            Optional<UsuarioComportamiento> comportamientoOpt = 
                comportamientoRepository.findByUsuarioIdAndProductoId(usuarioId, productoId);
            
            UsuarioComportamiento comportamiento;
            if (comportamientoOpt.isPresent()) {
                // Actualizar comportamiento existente
                comportamiento = comportamientoOpt.get();
                comportamiento.actualizarComportamiento(totalGastado, cantidad, pedido.getFechaCreacion());
            } else {
                // Crear nuevo comportamiento
                comportamiento = new UsuarioComportamiento(usuarioId, productoId, nombreProducto, categoriaProducto, 
                                                         tiendaId, nombreTienda, totalGastado, cantidad);
                // Para nuevos comportamientos, solo actualizar con los datos reales del pedido
                comportamiento.actualizarComportamiento(totalGastado, cantidad, pedido.getFechaCreacion());
            }
            
            comportamientoRepository.save(comportamiento);
            
            logger.info("🔄 Comportamiento actualizado: Usuario {}, Producto {} ({}), Frecuencia: {}", 
                       usuarioId, nombreProducto, categoriaProducto, comportamiento.getFrecuenciaCompra());
        }
        
        // Generar nuevas recomendaciones después de registrar el comportamiento
        generarRecomendacionesParaUsuario(usuarioId);
    }

    /**
     * 🎯 Generar recomendaciones personalizadas usando ML
     */
    public void generarRecomendacionesParaUsuario(Integer usuarioId) {
        logger.info("🧠 Generando recomendaciones ML para usuario: {}", usuarioId);
        
        // Limpiar recomendaciones antiguas
        limpiarRecomendacionesAntiguasUsuario(usuarioId);
        
        List<RecomendacionML> nuevasRecomendaciones = new ArrayList<>();
        
        // 1. Content-Based Filtering: Productos similares a los que ya compró
        nuevasRecomendaciones.addAll(generarRecomendacionesContentBased(usuarioId));
        
        // 2. Collaborative Filtering: Basado en usuarios similares
        nuevasRecomendaciones.addAll(generarRecomendacionesCollaborative(usuarioId));
        
        // 3. Recomendaciones por frecuencia y afinidad
        nuevasRecomendaciones.addAll(generarRecomendacionesPorAfinidad(usuarioId));
        
        // 4. Recomendaciones por patrones temporales
        nuevasRecomendaciones.addAll(generarRecomendacionesTemporales(usuarioId));
        
        // Guardar todas las recomendaciones
        recomendacionRepository.saveAll(nuevasRecomendaciones);
        
        logger.info("✅ Generadas {} recomendaciones ML para usuario {}", 
                   nuevasRecomendaciones.size(), usuarioId);
    }

    /**
     * 🔍 Content-Based Filtering: Recomendar productos similares
     */
    private List<RecomendacionML> generarRecomendacionesContentBased(Integer usuarioId) {
        List<RecomendacionML> recomendaciones = new ArrayList<>();
        
        // Obtener categorías preferidas del usuario
        List<UsuarioComportamiento> comportamientos = 
            comportamientoRepository.findByUsuarioIdOrderByPuntuacionAfinidadDesc(usuarioId);
        
        Set<String> categoriasPreferidas = comportamientos.stream()
            .map(UsuarioComportamiento::getCategoriaProducto)
            .collect(Collectors.toSet());
        
        Set<Integer> productosYaComprados = comportamientos.stream()
            .map(UsuarioComportamiento::getProductoId)
            .collect(Collectors.toSet());
        
        // Buscar productos similares en las categorías preferidas
        for (String categoria : categoriasPreferidas) {
            List<Producto> productosSimilares = productoRepository.findByClasificacionAndDisponibleTrue(
                com.remington.unieats.marketplace.model.enums.ClasificacionProducto.valueOf(categoria));
            
            for (Producto producto : productosSimilares) {
                // No recomendar productos que ya compró
                if (!productosYaComprados.contains(producto.getId()) && 
                    !recomendacionRepository.existsByUsuarioIdAndProductoId(usuarioId, producto.getId())) {
                    
                    // Calcular puntuación basada en afinidad de categoría
                    BigDecimal puntuacion = calcularPuntuacionContentBased(usuarioId, categoria);
                    
                    RecomendacionML recomendacion = new RecomendacionML(
                        usuarioId, producto.getId(), puntuacion,
                        RecomendacionML.TipoRecomendacion.CATEGORIA_PREFERIDA
                    );
                    
                    // Enriquecer con datos del producto
                    enriquecerRecomendacionConDatosProducto(recomendacion, producto);
                    
                    recomendaciones.add(recomendacion);
                }
            }
        }
        
        return recomendaciones.stream()
            .sorted((r1, r2) -> r2.getPuntuacionPredicha().compareTo(r1.getPuntuacionPredicha()))
            .limit(10)
            .collect(Collectors.toList());
    }

    /**
     * 👥 Collaborative Filtering: Basado en usuarios similares
     */
    private List<RecomendacionML> generarRecomendacionesCollaborative(Integer usuarioId) {
        List<RecomendacionML> recomendaciones = new ArrayList<>();
        
        // Encontrar usuarios similares
        List<Integer> usuariosSimilares = comportamientoRepository.findSimilarUsers(usuarioId, 2);
        
        Set<Integer> productosUsuario = comportamientoRepository
            .findByUsuarioIdOrderByPuntuacionAfinidadDesc(usuarioId)
            .stream()
            .map(UsuarioComportamiento::getProductoId)
            .collect(Collectors.toSet());
        
        for (Integer usuarioSimilar : usuariosSimilares) {
            List<UsuarioComportamiento> comportamientosSimilar = 
                comportamientoRepository.findByUsuarioIdAndEsFavoritoTrueOrderByPuntuacionAfinidadDesc(usuarioSimilar);
            
            for (UsuarioComportamiento comp : comportamientosSimilar) {
                // Recomendar productos que el usuario similar compra pero el usuario actual no
                if (!productosUsuario.contains(comp.getProductoId()) &&
                    !recomendacionRepository.existsByUsuarioIdAndProductoId(usuarioId, comp.getProductoId())) {
                    
                Producto producto = productoRepository.findById(comp.getProductoId()).orElse(null);
                if (producto != null && producto.isDisponible()) {                        // Puntuación basada en afinidad del usuario similar
                        BigDecimal puntuacion = comp.getPuntuacionAfinidad()
                            .multiply(BigDecimal.valueOf(0.8)); // Factor de similitud
                        
                        RecomendacionML recomendacion = new RecomendacionML(
                            usuarioId, producto.getId(), puntuacion,
                            RecomendacionML.TipoRecomendacion.CATEGORIA_PREFERIDA  // TEMPORAL: Cambiado de SIMILAR_USUARIOS
                        );
                        
                        enriquecerRecomendacionConDatosProducto(recomendacion, producto);
                        recomendaciones.add(recomendacion);
                    }
                }
            }
        }
        
        return recomendaciones.stream()
            .sorted((r1, r2) -> r2.getPuntuacionPredicha().compareTo(r1.getPuntuacionPredicha()))
            .limit(5)
            .collect(Collectors.toList());
    }

    /**
     * ⭐ Recomendaciones por afinidad y frecuencia
     */
    private List<RecomendacionML> generarRecomendacionesPorAfinidad(Integer usuarioId) {
        List<RecomendacionML> recomendaciones = new ArrayList<>();
        
        // Obtener productos favoritos para recomendar recompra
        List<UsuarioComportamiento> favoritos = 
            comportamientoRepository.findByUsuarioIdAndEsFavoritoTrueOrderByPuntuacionAfinidadDesc(usuarioId);
        
        for (UsuarioComportamiento favorito : favoritos) {
            // Verificar si han pasado suficientes días desde la última compra
            long diasDesdeUltimaCompra = java.time.temporal.ChronoUnit.DAYS
                .between(favorito.getUltimaCompra(), LocalDateTime.now());
            
            if (diasDesdeUltimaCompra >= 3) { // Recomendar recompra después de 3 días
                Producto producto = productoRepository.findById(favorito.getProductoId()).orElse(null);
                if (producto != null && producto.isDisponible() &&
                    !recomendacionRepository.existsByUsuarioIdAndProductoId(usuarioId, producto.getId())) {
                    
                    // Puntuación alta para productos favoritos
                    BigDecimal puntuacion = favorito.getPuntuacionAfinidad()
                        .add(BigDecimal.valueOf(20)); // Bonus para favoritos
                    
                    RecomendacionML recomendacion = new RecomendacionML(
                        usuarioId, producto.getId(), puntuacion,
                        RecomendacionML.TipoRecomendacion.PRODUCTO_FAVORITO
                    );
                    
                    enriquecerRecomendacionConDatosProducto(recomendacion, producto);
                    recomendaciones.add(recomendacion);
                }
            }
        }
        
        return recomendaciones;
    }

    /**
     * ⏰ Recomendaciones por patrones temporales
     */
    private List<RecomendacionML> generarRecomendacionesTemporales(Integer usuarioId) {
        List<RecomendacionML> recomendaciones = new ArrayList<>();
        
        int horaActual = LocalDateTime.now().getHour();
        
        // Obtener productos que el usuario compra en esta hora
        List<UsuarioComportamiento> productosHora = 
            comportamientoRepository.findByUsuarioIdAndHoraPreferidaCompra(usuarioId, horaActual);
        
        for (UsuarioComportamiento comp : productosHora) {
            Producto producto = productoRepository.findById(comp.getProductoId()).orElse(null);
            if (producto != null && producto.isDisponible() &&
                !recomendacionRepository.existsByUsuarioIdAndProductoId(usuarioId, producto.getId())) {
                
                BigDecimal puntuacion = comp.getPuntuacionAfinidad()
                    .add(BigDecimal.valueOf(15)); // Bonus temporal
                
                RecomendacionML recomendacion = new RecomendacionML(
                    usuarioId, producto.getId(), puntuacion,
                    RecomendacionML.TipoRecomendacion.TENDENCIA_TEMPORAL
                );
                
                enriquecerRecomendacionConDatosProducto(recomendacion, producto);
                recomendaciones.add(recomendacion);
            }
        }
        
        return recomendaciones;
    }

    /**
     * 📊 Calcular puntuación Content-Based
     */
    private BigDecimal calcularPuntuacionContentBased(Integer usuarioId, String categoria) {
        // Obtener afinidad promedio del usuario con esta categoría
        List<UsuarioComportamiento> comportamientosCategoria = 
            comportamientoRepository.findByUsuarioIdAndCategoriaProductoOrderByFrecuenciaCompraDesc(usuarioId, categoria);
        
        if (comportamientosCategoria.isEmpty()) {
            return BigDecimal.valueOf(50); // Puntuación base
        }
        
        BigDecimal afinidadPromedio = comportamientosCategoria.stream()
            .map(UsuarioComportamiento::getPuntuacionAfinidad)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .divide(BigDecimal.valueOf(comportamientosCategoria.size()), 2, java.math.RoundingMode.HALF_UP);
        
        // Factores adicionales (precio, disponibilidad, etc.)
        BigDecimal factorPrecio = BigDecimal.valueOf(10); // Simplificado
        
        return afinidadPromedio.add(factorPrecio);
    }

    /**
     * 📝 Enriquecer recomendación con datos del producto
     */
    private void enriquecerRecomendacionConDatosProducto(RecomendacionML recomendacion, Producto producto) {
        recomendacion.setNombreProducto(producto.getNombre());
        recomendacion.setPrecioProducto(producto.getPrecio());
        recomendacion.setImagenProducto(producto.getImagenUrl());
        recomendacion.setCategoriaProducto(producto.getClasificacion().name());
        recomendacion.setTiendaId(producto.getTienda().getId());
        recomendacion.setNombreTienda(producto.getTienda().getNombre());
        
        // Score de confianza ya está en puntuacionPredicha que mapea a score_confianza
        // No necesitamos processing adicional
    }

    /**
     * 🗂️ Obtener recomendaciones para un usuario
     */
    public List<RecomendacionML> obtenerRecomendacionesParaUsuario(Integer usuarioId, int limite) {
        List<RecomendacionML> recomendaciones = recomendacionRepository.findTopRecomendacionesByUsuario(usuarioId, limite);
        
        // Si el usuario no tiene recomendaciones, generar algunas por defecto
        if (recomendaciones.isEmpty()) {
            logger.info("🆕 Usuario {} sin recomendaciones, generando recomendaciones por defecto...", usuarioId);
            generarRecomendacionesPorDefecto(usuarioId);
            // Obtener las recomendaciones recién creadas
            recomendaciones = recomendacionRepository.findTopRecomendacionesByUsuario(usuarioId, limite);
        }
        
        return recomendaciones;
    }

    /**
     * 🎯 Generar recomendaciones por defecto para usuarios sin historial
     */
    private void generarRecomendacionesPorDefecto(Integer usuarioId) {
        logger.info("🌟 Generando recomendaciones por defecto para usuario nuevo: {}", usuarioId);
        
        try {
            // Obtener productos populares de diferentes categorías
            List<Producto> productosPopulares = productoRepository.findAll().stream()
                .filter(Producto::isDisponible)
                .collect(Collectors.toList());
            
            if (productosPopulares.isEmpty()) {
                logger.warn("⚠️ No hay productos disponibles para generar recomendaciones por defecto");
                return;
            }
            
            List<RecomendacionML> recomendacionesDefecto = new ArrayList<>();
            
            // Generar 8-10 recomendaciones aleatorias de productos populares
            java.util.Collections.shuffle(productosPopulares);
            int numRecomendaciones = Math.min(8, productosPopulares.size());
            
            for (int i = 0; i < numRecomendaciones; i++) {
                Producto producto = productosPopulares.get(i);
                
                // Verificar que no exista ya esta recomendación
                if (!recomendacionRepository.existsByUsuarioIdAndProductoId(usuarioId, producto.getId())) {
                    
                    // Puntuación aleatoria pero realista (6.5 - 8.5)
                    BigDecimal puntuacion = BigDecimal.valueOf(6.5 + (Math.random() * 2.0));
                    
                    RecomendacionML recomendacion = new RecomendacionML(
                        usuarioId, 
                        producto.getId(), 
                        puntuacion,
                        RecomendacionML.TipoRecomendacion.CATEGORIA_PREFERIDA
                    );
                    
                    // Enriquecer con datos del producto
                    enriquecerRecomendacionConDatosProducto(recomendacion, producto);
                    
                    recomendacionesDefecto.add(recomendacion);
                }
            }
            
            // Guardar todas las recomendaciones
            if (!recomendacionesDefecto.isEmpty()) {
                recomendacionRepository.saveAll(recomendacionesDefecto);
                logger.info("✅ Generadas {} recomendaciones por defecto para usuario {}", 
                    recomendacionesDefecto.size(), usuarioId);
            }
            
        } catch (Exception e) {
            logger.error("❌ Error generando recomendaciones por defecto para usuario {}: {}", 
                usuarioId, e.getMessage());
        }
    }

    /**
     * 👁️ Marcar recomendación como mostrada
     */
    public void marcarRecomendacionComoMostrada(Long recomendacionId) {
        recomendacionRepository.findById(recomendacionId).ifPresent(rec -> {
            rec.marcarComoMostrada();
            recomendacionRepository.save(rec);
        });
    }

    /**
     * ✅ Marcar recomendación como aceptada
     */
    public void marcarRecomendacionComoAceptada(Long recomendacionId) {
        recomendacionRepository.findById(recomendacionId).ifPresent(rec -> {
            rec.marcarComoAceptada();
            recomendacionRepository.save(rec);
        });
    }

    /**
     * 🧹 Limpiar recomendaciones antiguas de un usuario
     */
    private void limpiarRecomendacionesAntiguasUsuario(Integer usuarioId) {
        // Mantener solo las recomendaciones de los últimos 7 días
        LocalDateTime fechaLimite = LocalDateTime.now().minusDays(7);
        
        // Eliminar recomendaciones expiradas o muy antiguas
        recomendacionRepository.deleteByUsuarioIdAndFechaCreacionBefore(usuarioId, fechaLimite);
        
        logger.debug("🧹 Limpiadas recomendaciones antiguas para usuario: {}", usuarioId);
    }

    /**
     * 🏷️ Obtener categorías preferidas del usuario basadas en su comportamiento de compra
     */
    public List<String> obtenerCategoriasPreferidas(Integer usuarioId) {
        try {
            List<UsuarioComportamiento> comportamientos = 
                comportamientoRepository.findByUsuarioIdOrderByFrecuenciaCompraDesc(usuarioId);
            
            // Obtener categorías ordenadas por frecuencia de compra
            List<String> categoriasOrdenadas = comportamientos.stream()
                .filter(c -> c.getFrecuenciaCompra() >= 2) // Solo categorías con al menos 2 compras
                .map(UsuarioComportamiento::getCategoriaProducto)
                .distinct()
                .collect(Collectors.toList());
            
            logger.info("🏷️ ML encontró {} categorías preferidas para usuario {}: {}", 
                categoriasOrdenadas.size(), usuarioId, categoriasOrdenadas);
            
            return categoriasOrdenadas;
            
        } catch (Exception e) {
            logger.warn("⚠️ Error al obtener categorías preferidas para usuario {}: {}", usuarioId, e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * 🔄 Reorganizar productos usando ML
     */
    public List<Producto> reorganizarProductosPorML(List<Producto> productos, Integer usuarioId) {
        try {
            if (usuarioId == null || productos.isEmpty()) {
                return productos;
            }

            List<UsuarioComportamiento> comportamientos = 
                comportamientoRepository.findByUsuarioIdOrderByPuntuacionAfinidadDesc(usuarioId);

            if (comportamientos.isEmpty()) {
                return productos; // Sin datos ML, devolver orden original
            }

            List<Producto> productosFavoritos = new ArrayList<>();
            List<Producto> productosCategoriasPreferidas = new ArrayList<>();
            List<Producto> productosResto = new ArrayList<>();

            // Obtener IDs de productos comprados y categorías preferidas
            Set<Integer> productosComprados = comportamientos.stream()
                .map(UsuarioComportamiento::getProductoId)
                .collect(Collectors.toSet());

            Set<String> categoriasPreferidas = comportamientos.stream()
                .map(UsuarioComportamiento::getCategoriaProducto)
                .collect(Collectors.toSet());
            
            // Clasificar productos usando ML
            for (Producto producto : productos) {
                if (productosComprados.contains(producto.getId())) {
                    // Producto que ya compró = ALTA PRIORIDAD
                    productosFavoritos.add(producto);
                } else if (categoriasPreferidas.contains(producto.getClasificacion().name())) {
                    // Categoría que le gusta = MEDIA PRIORIDAD
                    productosCategoriasPreferidas.add(producto);
                } else {
                    // Resto = BAJA PRIORIDAD
                    productosResto.add(producto);
                }
            }
            
            // Reorganizar: Favoritos → Categorías Preferidas → Resto
            List<Producto> productosReorganizados = new ArrayList<>();
            productosReorganizados.addAll(productosFavoritos);
            productosReorganizados.addAll(productosCategoriasPreferidas);
            productosReorganizados.addAll(productosResto);
            
            logger.info("🤖 ML reorganizó {} productos para usuario {}: {} favoritos, {} categorías preferidas", 
                productos.size(), usuarioId, productosFavoritos.size(), productosCategoriasPreferidas.size());
            
            return productosReorganizados;
            
        } catch (Exception e) {
            logger.warn("⚠️ Error en ML reorganización, devolviendo orden original: {}", e.getMessage());
            return productos;
        }
    }
}