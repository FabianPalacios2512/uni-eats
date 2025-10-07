package com.remington.unieats.marketplace.entity;

public enum TipoPromocion {
    SUPER_PROMO("🔥 Súper Promo", "¡Precio especial por tiempo limitado!"),
    MAS_VENDIDO("⭐ Más Vendido Hoy", "¡No te quedes sin probarlo!"),
    OFERTA_ESPECIAL("💥 Oferta Especial", "¡Aprovecha esta increíble oferta!"),
    DESCUENTO_FLASH("⚡ Descuento Flash", "¡Solo por pocas horas!"),
    PRODUCTO_DESTACADO("👑 Producto Destacado", "¡El favorito de nuestros clientes!");
    
    private final String etiqueta;
    private final String descripcion;
    
    TipoPromocion(String etiqueta, String descripcion) {
        this.etiqueta = etiqueta;
        this.descripcion = descripcion;
    }
    
    public String getEtiqueta() {
        return etiqueta;
    }
    
    public String getDescripcion() {
        return descripcion;
    }
}