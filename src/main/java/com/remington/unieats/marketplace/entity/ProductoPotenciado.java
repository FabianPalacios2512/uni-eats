package com.remington.unieats.marketplace.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.remington.unieats.marketplace.model.entity.Producto;
import com.remington.unieats.marketplace.model.entity.Tienda;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "productos_potenciados")
public class ProductoPotenciado {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;
    
    @ManyToOne
    @JoinColumn(name = "tienda_id", nullable = false)
    private Tienda tienda;
    
    @Column(name = "precio_original", precision = 10, scale = 2, nullable = false)
    private BigDecimal precioOriginal;
    
    @Column(name = "precio_promocional", precision = 10, scale = 2, nullable = false)
    private BigDecimal precioPromocional;
    
    @Column(name = "precio_mostrado", precision = 10, scale = 2, nullable = false)
    private BigDecimal precioMostrado; // Precio "antes" para mostrar descuento
    
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_promocion", nullable = false)
    private TipoPromocion tipoPromocion;
    
    @Column(name = "fecha_inicio", nullable = false)
    private LocalDateTime fechaInicio;
    
    @Column(name = "fecha_fin", nullable = false)
    private LocalDateTime fechaFin;
    
    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
    
    @Column(name = "monto_pagado", precision = 10, scale = 2, nullable = false)
    private BigDecimal montoPagado;
    
    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();
    
    // Constructores
    public ProductoPotenciado() {}
    
    public ProductoPotenciado(Producto producto, Tienda tienda, BigDecimal precioOriginal, 
                            BigDecimal precioPromocional, BigDecimal precioMostrado, 
                            TipoPromocion tipoPromocion, BigDecimal montoPagado) {
        this.producto = producto;
        this.tienda = tienda;
        this.precioOriginal = precioOriginal;
        this.precioPromocional = precioPromocional;
        this.precioMostrado = precioMostrado;
        this.tipoPromocion = tipoPromocion;
        this.montoPagado = montoPagado;
        this.fechaInicio = LocalDateTime.now();
        this.fechaFin = LocalDateTime.now().plusHours(4);
    }
    
    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }
    
    public Tienda getTienda() { return tienda; }
    public void setTienda(Tienda tienda) { this.tienda = tienda; }
    
    public BigDecimal getPrecioOriginal() { return precioOriginal; }
    public void setPrecioOriginal(BigDecimal precioOriginal) { this.precioOriginal = precioOriginal; }
    
    public BigDecimal getPrecioPromocional() { return precioPromocional; }
    public void setPrecioPromocional(BigDecimal precioPromocional) { this.precioPromocional = precioPromocional; }
    
    public BigDecimal getPrecioMostrado() { return precioMostrado; }
    public void setPrecioMostrado(BigDecimal precioMostrado) { this.precioMostrado = precioMostrado; }
    
    public TipoPromocion getTipoPromocion() { return tipoPromocion; }
    public void setTipoPromocion(TipoPromocion tipoPromocion) { this.tipoPromocion = tipoPromocion; }
    
    public LocalDateTime getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDateTime fechaInicio) { this.fechaInicio = fechaInicio; }
    
    public LocalDateTime getFechaFin() { return fechaFin; }
    public void setFechaFin(LocalDateTime fechaFin) { this.fechaFin = fechaFin; }
    
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
    
    public BigDecimal getMontoPagado() { return montoPagado; }
    public void setMontoPagado(BigDecimal montoPagado) { this.montoPagado = montoPagado; }
    
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    
    // Métodos útiles
    public boolean isVigente() {
        LocalDateTime ahora = LocalDateTime.now();
        return activo && ahora.isAfter(fechaInicio) && ahora.isBefore(fechaFin);
    }
    
    public long getHorasRestantes() {
        if (!isVigente()) return 0;
        LocalDateTime ahora = LocalDateTime.now();
        return java.time.Duration.between(ahora, fechaFin).toHours();
    }
    
    public BigDecimal getDescuentoPorcentaje() {
        if (precioMostrado.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        BigDecimal descuento = precioMostrado.subtract(precioPromocional);
        return descuento.divide(precioMostrado, 4, java.math.RoundingMode.HALF_UP)
                      .multiply(BigDecimal.valueOf(100));
    }
}