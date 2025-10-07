package com.remington.unieats.marketplace.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.remington.unieats.marketplace.entity.TipoPromocion;

public class ProductoPotenciadoDTO {
    private Long id;
    private Integer productoId;
    private String nombreProducto;
    private String imagenProducto;
    private Integer tiendaId;
    private String nombreTienda;
    private String logoTienda;
    private BigDecimal precioOriginal;
    private BigDecimal precioPromocional;
    private BigDecimal precioMostrado;
    private TipoPromocion tipoPromocion;
    private String etiquetaPromocion;
    private String descripcionPromocion;
    private LocalDateTime fechaInicio;
    private LocalDateTime fechaFin;
    private long horasRestantes;
    private BigDecimal descuentoPorcentaje;
    private boolean vigente;
    
    // Constructores
    public ProductoPotenciadoDTO() {}
    
    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Integer getProductoId() { return productoId; }
    public void setProductoId(Integer productoId) { this.productoId = productoId; }
    
    public String getNombreProducto() { return nombreProducto; }
    public void setNombreProducto(String nombreProducto) { this.nombreProducto = nombreProducto; }
    
    public String getImagenProducto() { return imagenProducto; }
    public void setImagenProducto(String imagenProducto) { this.imagenProducto = imagenProducto; }
    
    public Integer getTiendaId() { return tiendaId; }
    public void setTiendaId(Integer tiendaId) { this.tiendaId = tiendaId; }
    
    public String getNombreTienda() { return nombreTienda; }
    public void setNombreTienda(String nombreTienda) { this.nombreTienda = nombreTienda; }
    
    public String getLogoTienda() { return logoTienda; }
    public void setLogoTienda(String logoTienda) { this.logoTienda = logoTienda; }
    
    public BigDecimal getPrecioOriginal() { return precioOriginal; }
    public void setPrecioOriginal(BigDecimal precioOriginal) { this.precioOriginal = precioOriginal; }
    
    public BigDecimal getPrecioPromocional() { return precioPromocional; }
    public void setPrecioPromocional(BigDecimal precioPromocional) { this.precioPromocional = precioPromocional; }
    
    public BigDecimal getPrecioMostrado() { return precioMostrado; }
    public void setPrecioMostrado(BigDecimal precioMostrado) { this.precioMostrado = precioMostrado; }
    
    public TipoPromocion getTipoPromocion() { return tipoPromocion; }
    public void setTipoPromocion(TipoPromocion tipoPromocion) { this.tipoPromocion = tipoPromocion; }
    
    public String getEtiquetaPromocion() { return etiquetaPromocion; }
    public void setEtiquetaPromocion(String etiquetaPromocion) { this.etiquetaPromocion = etiquetaPromocion; }
    
    public String getDescripcionPromocion() { return descripcionPromocion; }
    public void setDescripcionPromocion(String descripcionPromocion) { this.descripcionPromocion = descripcionPromocion; }
    
    public LocalDateTime getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDateTime fechaInicio) { this.fechaInicio = fechaInicio; }
    
    public LocalDateTime getFechaFin() { return fechaFin; }
    public void setFechaFin(LocalDateTime fechaFin) { this.fechaFin = fechaFin; }
    
    public long getHorasRestantes() { return horasRestantes; }
    public void setHorasRestantes(long horasRestantes) { this.horasRestantes = horasRestantes; }
    
    public BigDecimal getDescuentoPorcentaje() { return descuentoPorcentaje; }
    public void setDescuentoPorcentaje(BigDecimal descuentoPorcentaje) { this.descuentoPorcentaje = descuentoPorcentaje; }
    
    public boolean isVigente() { return vigente; }
    public void setVigente(boolean vigente) { this.vigente = vigente; }
}