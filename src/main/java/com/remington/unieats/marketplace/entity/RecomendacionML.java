package com.remington.unieats.marketplace.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 🎯 Entidad para almacenar recomendaciones personalizadas generadas por ML
 * Tabla principal donde se guardan las recomendaciones calculadas
 */
@Entity
@Table(name = "recomendaciones_ml")
public class RecomendacionML {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Integer usuarioId;

    @Column(name = "producto_id", nullable = false)
    private Integer productoId;

    @Column(name = "score_confianza", precision = 5, scale = 2, nullable = false)
    private BigDecimal puntuacionPredicha;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_recomendacion", nullable = false)
    private TipoRecomendacion tipoRecomendacion;

    // REMOVED: algoritmo_usado - column doesn't exist in database
    // @Enumerated(EnumType.STRING)
    // @Column(name = "algoritmo_usado", nullable = false)
    // private AlgoritmoML algoritmoUsado;

    @Column(name = "categoria_producto")
    private String categoriaProducto;

    @Column(name = "nombre_producto")
    private String nombreProducto;

    @Column(name = "precio_producto", precision = 10, scale = 2)
    private BigDecimal precioProducto;

    @Column(name = "imagen_producto")
    private String imagenProducto;

    @Column(name = "tienda_id")
    private Integer tiendaId;

    @Column(name = "nombre_tienda")
    private String nombreTienda;

    // REMOVED: fue_mostrada - column doesn't exist, using veces_mostrada instead
    @Column(name = "veces_mostrada")
    private Integer vecesMostrada = 0;

    @Column(name = "fue_aceptada", nullable = false)
    private Boolean fueAceptada = false;

    @Column(name = "fecha_mostrada")
    private LocalDateTime fechaMostrada;

    @Column(name = "fecha_aceptada")
    private LocalDateTime fechaAceptada;

    @Column(name = "fecha_generada", nullable = false)
    private LocalDateTime fechaGeneracion = LocalDateTime.now();

    // Enums
    public enum TipoRecomendacion {
        PRODUCTO_FAVORITO,           // Producto que ya compró antes
        CATEGORIA_PREFERIDA,         // Productos de categoría que le gusta
        SIMILAR_USUARIOS,            // Basado en usuarios similares
        COMPLEMENTO_COMPRA,          // Productos que van bien juntos
        TENDENCIA_TEMPORAL,          // Basado en hora/día de compra
        NUEVO_PRODUCTO,              // Productos nuevos en tiendas favoritas
        PRECIO_SIMILAR,              // Productos en rango de precio habitual
        TIENDA_FAVORITA,             // Productos de tiendas frecuentadas
        HORA_HABITUAL               // Basado en horarios habituales del usuario
    }

    public enum AlgoritmoML {
        CONTENT_BASED_FILTERING,     // Filtrado basado en contenido
        COLLABORATIVE_FILTERING,     // Filtrado colaborativo
        HYBRID_APPROACH,             // Enfoque híbrido
        FREQUENCY_BASED,             // Basado en frecuencia
        AFFINITY_SCORING            // Puntuación de afinidad
    }

    // Constructores
    public RecomendacionML() {}

    public RecomendacionML(Integer usuarioId, Integer productoId, BigDecimal puntuacionPredicha, 
                          TipoRecomendacion tipoRecomendacion) {
        this.usuarioId = usuarioId;
        this.productoId = productoId;
        this.puntuacionPredicha = puntuacionPredicha;
        this.tipoRecomendacion = tipoRecomendacion;
    }

    // Métodos de utilidad
    public boolean isExpired() {
        return false; // Sin fecha de expiración
    }

    public void marcarComoMostrada() {
        this.vecesMostrada = (this.vecesMostrada == null ? 0 : this.vecesMostrada) + 1;
        this.fechaMostrada = LocalDateTime.now();
    }

    public void marcarComoAceptada() {
        this.fueAceptada = true;
        this.fechaAceptada = LocalDateTime.now();
    }

    public double getEfectividadRecomendacion() {
        if (vecesMostrada == null || vecesMostrada == 0) return 0.0;
        return (fueAceptada != null && fueAceptada) ? 100.0 : 0.0;
    }

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Integer usuarioId) { this.usuarioId = usuarioId; }

    public Integer getProductoId() { return productoId; }
    public void setProductoId(Integer productoId) { this.productoId = productoId; }

    public BigDecimal getPuntuacionPredicha() { return puntuacionPredicha; }
    public void setPuntuacionPredicha(BigDecimal puntuacionPredicha) { this.puntuacionPredicha = puntuacionPredicha; }

    public TipoRecomendacion getTipoRecomendacion() { return tipoRecomendacion; }
    public void setTipoRecomendacion(TipoRecomendacion tipoRecomendacion) { this.tipoRecomendacion = tipoRecomendacion; }

    // REMOVED: AlgoritmoML getters/setters - field doesn't exist in database

    public String getCategoriaProducto() { return categoriaProducto; }
    public void setCategoriaProducto(String categoriaProducto) { this.categoriaProducto = categoriaProducto; }

    public String getNombreProducto() { return nombreProducto; }
    public void setNombreProducto(String nombreProducto) { this.nombreProducto = nombreProducto; }

    public BigDecimal getPrecioProducto() { return precioProducto; }
    public void setPrecioProducto(BigDecimal precioProducto) { this.precioProducto = precioProducto; }

    public String getImagenProducto() { return imagenProducto; }
    public void setImagenProducto(String imagenProducto) { this.imagenProducto = imagenProducto; }

    public Integer getTiendaId() { return tiendaId; }
    public void setTiendaId(Integer tiendaId) { this.tiendaId = tiendaId; }

    public String getNombreTienda() { return nombreTienda; }
    public void setNombreTienda(String nombreTienda) { this.nombreTienda = nombreTienda; }

    public Integer getVecesMostrada() { return vecesMostrada; }
    public void setVecesMostrada(Integer vecesMostrada) { this.vecesMostrada = vecesMostrada; }

    public Boolean getFueAceptada() { return fueAceptada; }
    public void setFueAceptada(Boolean fueAceptada) { this.fueAceptada = fueAceptada; }

    public LocalDateTime getFechaMostrada() { return fechaMostrada; }
    public void setFechaMostrada(LocalDateTime fechaMostrada) { this.fechaMostrada = fechaMostrada; }

    public LocalDateTime getFechaAceptada() { return fechaAceptada; }
    public void setFechaAceptada(LocalDateTime fechaAceptada) { this.fechaAceptada = fechaAceptada; }

    public LocalDateTime getFechaGeneracion() { return fechaGeneracion; }
    public void setFechaGeneracion(LocalDateTime fechaGeneracion) { this.fechaGeneracion = fechaGeneracion; }
}