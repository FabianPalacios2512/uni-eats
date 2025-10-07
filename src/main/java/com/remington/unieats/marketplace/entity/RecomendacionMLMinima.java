package com.remington.unieats.marketplace.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 🎯 Entidad MÍNIMA para recomendaciones ML - Solo campos que existen en DB
 */
@Entity
@Table(name = "recomendaciones_ml")
public class RecomendacionMLMinima {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Integer usuarioId;

    @Column(name = "producto_id", nullable = false)
    private Integer productoId;

    @Column(name = "score_confianza", precision = 5, scale = 2, nullable = false)
    private BigDecimal scoreConfianza;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_recomendacion", nullable = false)
    private TipoRecomendacion tipoRecomendacion;

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

    @Column(name = "fue_aceptada", nullable = false)
    private Boolean fueAceptada = false;

    @Column(name = "fecha_mostrada")
    private LocalDateTime fechaMostrada;

    @Column(name = "fecha_aceptada")
    private LocalDateTime fechaAceptada;

    @Column(name = "fecha_generada", nullable = false)
    private LocalDateTime fechaGenerada = LocalDateTime.now();

    @Column(name = "veces_mostrada")
    private Integer vecesMostrada = 0;

    @Column(name = "razon_recomendacion")
    private String razonRecomendacion;

    // Enum simplificado
    public enum TipoRecomendacion {
        CATEGORIA_PREFERIDA,
        SIMILAR_USUARIOS,
        PRODUCTO_FAVORITO,
        HORA_HABITUAL,
        TENDENCIA_TEMPORAL
    }

    // Constructores
    public RecomendacionMLMinima() {}

    public RecomendacionMLMinima(Integer usuarioId, Integer productoId, BigDecimal scoreConfianza, 
                               TipoRecomendacion tipoRecomendacion) {
        this.usuarioId = usuarioId;
        this.productoId = productoId;
        this.scoreConfianza = scoreConfianza;
        this.tipoRecomendacion = tipoRecomendacion;
    }

    // Getters y Setters básicos
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Integer usuarioId) { this.usuarioId = usuarioId; }

    public Integer getProductoId() { return productoId; }
    public void setProductoId(Integer productoId) { this.productoId = productoId; }

    public BigDecimal getScoreConfianza() { return scoreConfianza; }
    public void setScoreConfianza(BigDecimal scoreConfianza) { this.scoreConfianza = scoreConfianza; }

    public TipoRecomendacion getTipoRecomendacion() { return tipoRecomendacion; }
    public void setTipoRecomendacion(TipoRecomendacion tipoRecomendacion) { this.tipoRecomendacion = tipoRecomendacion; }

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

    public Boolean getFueAceptada() { return fueAceptada; }
    public void setFueAceptada(Boolean fueAceptada) { this.fueAceptada = fueAceptada; }

    public LocalDateTime getFechaMostrada() { return fechaMostrada; }
    public void setFechaMostrada(LocalDateTime fechaMostrada) { this.fechaMostrada = fechaMostrada; }

    public LocalDateTime getFechaAceptada() { return fechaAceptada; }
    public void setFechaAceptada(LocalDateTime fechaAceptada) { this.fechaAceptada = fechaAceptada; }

    public LocalDateTime getFechaGenerada() { return fechaGenerada; }
    public void setFechaGenerada(LocalDateTime fechaGenerada) { this.fechaGenerada = fechaGenerada; }

    public Integer getVecesMostrada() { return vecesMostrada; }
    public void setVecesMostrada(Integer vecesMostrada) { this.vecesMostrada = vecesMostrada; }

    public String getRazonRecomendacion() { return razonRecomendacion; }
    public void setRazonRecomendacion(String razonRecomendacion) { this.razonRecomendacion = razonRecomendacion; }
}