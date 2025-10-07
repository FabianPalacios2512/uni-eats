package com.remington.unieats.marketplace.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 📊 Entidad para rastrear el comportamiento y patrones de compra del usuario
 * Utilizada para generar recomendaciones personalizadas basadas en ML
 */
@Entity
@Table(name = "usuario_comportamiento")
public class UsuarioComportamiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Integer usuarioId;

    @Column(name = "producto_id", nullable = false)
    private Integer productoId;

    @Column(name = "nombre_producto", nullable = false)
    private String nombreProducto;

    @Column(name = "categoria_producto", nullable = false)
    private String categoriaProducto;

    @Column(name = "tienda_id", nullable = false)
    private Integer tiendaId;

    @Column(name = "nombre_tienda", nullable = false)
    private String nombreTienda;

    @Column(name = "frecuencia_compra", nullable = false)
    private Integer frecuenciaCompra = 1;

    @Column(name = "total_gastado", precision = 10, scale = 2)
    private BigDecimal totalGastado = BigDecimal.ZERO;

    @Column(name = "promedio_cantidad", precision = 5, scale = 2)
    private BigDecimal promedioCantidad = BigDecimal.ONE;

    @Column(name = "es_favorito", nullable = true)
    private Boolean esFavorito = false;

    @Column(name = "puntuacion_afinidad", precision = 5, scale = 2)
    private BigDecimal puntuacionAfinidad = BigDecimal.ZERO;

    @Column(name = "hora_preferida_compra")
    private Integer horaPreferidaCompra;

    @Column(name = "ultima_compra", nullable = false)
    private LocalDateTime ultimaCompra;

    @Column(name = "fecha_creacion", nullable = true)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @Column(name = "fecha_actualizacion", nullable = true)
    private LocalDateTime fechaActualizacion = LocalDateTime.now();    // Constructores
    public UsuarioComportamiento() {}

    public UsuarioComportamiento(Integer usuarioId, Integer productoId, String nombreProducto, String categoriaProducto, 
                               Integer tiendaId, String nombreTienda, BigDecimal totalGastado, BigDecimal cantidad) {
        this.usuarioId = usuarioId;
        this.productoId = productoId;
        this.nombreProducto = nombreProducto;
        this.categoriaProducto = categoriaProducto;
        this.tiendaId = tiendaId;
        this.nombreTienda = nombreTienda;
        this.totalGastado = totalGastado;
        this.promedioCantidad = cantidad;
        this.fechaCreacion = LocalDateTime.now();
        this.fechaActualizacion = LocalDateTime.now();
        this.ultimaCompra = LocalDateTime.now();
        this.puntuacionAfinidad = BigDecimal.valueOf(50); // Valor inicial
        this.esFavorito = false;
        this.horaPreferidaCompra = LocalDateTime.now().getHour();
    }    // Métodos de ML
    public void actualizarComportamiento(BigDecimal nuevoGasto, BigDecimal nuevaCantidad, LocalDateTime fechaPedido) {
        this.frecuenciaCompra++;
        this.totalGastado = this.totalGastado != null ? this.totalGastado.add(nuevoGasto) : nuevoGasto;
        
        // Calcular nuevo promedio de cantidad con null-safety
        if (this.promedioCantidad == null) {
            this.promedioCantidad = nuevaCantidad;
        } else {
            this.promedioCantidad = this.promedioCantidad
                .multiply(BigDecimal.valueOf(this.frecuenciaCompra - 1))
                .add(nuevaCantidad)
                .divide(BigDecimal.valueOf(this.frecuenciaCompra), 2, java.math.RoundingMode.HALF_UP);
        }
        
        this.ultimaCompra = fechaPedido;
        this.horaPreferidaCompra = fechaPedido.getHour();
        this.fechaActualizacion = LocalDateTime.now();
        
        // Detectar si es favorito (más de 2 compras)
        this.esFavorito = this.frecuenciaCompra >= 2;
        
        // Calcular puntuación de afinidad
        calcularPuntuacionAfinidad();
    }

    private void calcularPuntuacionAfinidad() {
        // Algoritmo ML para calcular afinidad basado en:
        // - Frecuencia de compra (40%)
        // - Total gastado (30%)
        // - Recencia de compra (20%)
        // - Cantidad promedio (10%)
        
        BigDecimal frecuenciaScore = BigDecimal.valueOf(Math.min(frecuenciaCompra * 20, 100));
        BigDecimal gastoScore = totalGastado.multiply(BigDecimal.valueOf(0.5));
        
        // Calcular recencia (días desde última compra)
        long diasDesdeUltimaCompra = java.time.temporal.ChronoUnit.DAYS.between(ultimaCompra, LocalDateTime.now());
        BigDecimal recenciaScore = BigDecimal.valueOf(Math.max(100 - diasDesdeUltimaCompra * 2, 0));
        
        BigDecimal cantidadScore = promedioCantidad.multiply(BigDecimal.valueOf(10));
        
        this.puntuacionAfinidad = frecuenciaScore.multiply(BigDecimal.valueOf(0.4))
            .add(gastoScore.multiply(BigDecimal.valueOf(0.3)))
            .add(recenciaScore.multiply(BigDecimal.valueOf(0.2)))
            .add(cantidadScore.multiply(BigDecimal.valueOf(0.1)));
        
        // Normalizar entre 0-100
        if (this.puntuacionAfinidad.compareTo(BigDecimal.valueOf(100)) > 0) {
            this.puntuacionAfinidad = BigDecimal.valueOf(100);
        }
    }

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Integer usuarioId) { this.usuarioId = usuarioId; }

    public Integer getProductoId() { return productoId; }
    public void setProductoId(Integer productoId) { this.productoId = productoId; }

    public String getNombreProducto() { return nombreProducto; }
    public void setNombreProducto(String nombreProducto) { this.nombreProducto = nombreProducto; }

    public String getCategoriaProducto() { return categoriaProducto; }
    public void setCategoriaProducto(String categoriaProducto) { this.categoriaProducto = categoriaProducto; }

    public Integer getTiendaId() { return tiendaId; }
    public void setTiendaId(Integer tiendaId) { this.tiendaId = tiendaId; }

    public String getNombreTienda() { return nombreTienda; }
    public void setNombreTienda(String nombreTienda) { this.nombreTienda = nombreTienda; }

    public Integer getFrecuenciaCompra() { return frecuenciaCompra; }
    public void setFrecuenciaCompra(Integer frecuenciaCompra) { this.frecuenciaCompra = frecuenciaCompra; }

    public BigDecimal getTotalGastado() { return totalGastado; }
    public void setTotalGastado(BigDecimal totalGastado) { this.totalGastado = totalGastado; }

    public BigDecimal getPromedioCantidad() { return promedioCantidad; }
    public void setPromedioCantidad(BigDecimal promedioCantidad) { this.promedioCantidad = promedioCantidad; }

    public Boolean getEsFavorito() { return esFavorito; }
    public void setEsFavorito(Boolean esFavorito) { this.esFavorito = esFavorito; }

    public BigDecimal getPuntuacionAfinidad() { return puntuacionAfinidad; }
    public void setPuntuacionAfinidad(BigDecimal puntuacionAfinidad) { this.puntuacionAfinidad = puntuacionAfinidad; }

    public Integer getHoraPreferidaCompra() { return horaPreferidaCompra; }
    public void setHoraPreferidaCompra(Integer horaPreferidaCompra) { this.horaPreferidaCompra = horaPreferidaCompra; }

    public LocalDateTime getUltimaCompra() { return ultimaCompra; }
    public void setUltimaCompra(LocalDateTime ultimaCompra) { this.ultimaCompra = ultimaCompra; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
    public void setFechaActualizacion(LocalDateTime fechaActualizacion) { this.fechaActualizacion = fechaActualizacion; }
}