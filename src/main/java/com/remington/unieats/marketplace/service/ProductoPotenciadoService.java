package com.remington.unieats.marketplace.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.remington.unieats.marketplace.dto.ProductoPotenciadoDTO;
import com.remington.unieats.marketplace.entity.ProductoPotenciado;
import com.remington.unieats.marketplace.entity.TipoPromocion;
import com.remington.unieats.marketplace.model.entity.Producto;
import com.remington.unieats.marketplace.model.entity.Tienda;
import com.remington.unieats.marketplace.model.repository.ProductoRepository;
import com.remington.unieats.marketplace.model.repository.TiendaRepository;
import com.remington.unieats.marketplace.repository.ProductoPotenciadoRepository;

@Service
@Transactional
public class ProductoPotenciadoService {
    
    @Autowired
    private ProductoPotenciadoRepository productoPotenciadoRepository;
    
    @Autowired
    private ProductoRepository productoRepository;
    
    @Autowired
    private TiendaRepository tiendaRepository;
    
    // Precio base por potenciar un producto (4 horas)
    private static final BigDecimal PRECIO_BASE_POTENCIACION = new BigDecimal("5000.00");
    
    /**
     * Obtener productos potenciados activos para mostrar a compradores
     */
    public List<ProductoPotenciadoDTO> getProductosPotenciadosActivos() {
        LocalDateTime ahora = LocalDateTime.now();
        List<ProductoPotenciado> productos = productoPotenciadoRepository.findProductosActivosVigentes(ahora);
        
        return productos.stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Potenciar productos de forma simplificada (sin cambiar precios del producto original)
     */
    public String potenciarProductosSimple(Integer tiendaId, List<Integer> productosIds, TipoPromocion tipoPromocion) {
        // Validar la tienda
        Tienda tienda = tiendaRepository.findById(tiendaId)
                .orElseThrow(() -> new RuntimeException("Tienda no encontrada"));
        
        // Verificar límite de productos activos (máximo 5 por tienda)
        LocalDateTime ahora = LocalDateTime.now();
        long productosActivosActuales = productoPotenciadoRepository.countProductosActivosByTienda(tienda, ahora);
        
        if (productosActivosActuales + productosIds.size() > 5) {
            throw new RuntimeException("No puedes tener más de 5 productos potenciados simultáneamente. " +
                    "Actualmente tienes " + productosActivosActuales + " productos activos.");
        }
        
        // Calcular costo total
        BigDecimal montoTotal = PRECIO_BASE_POTENCIACION.multiply(new BigDecimal(productosIds.size()));
        
        // Crear potencializaciones para cada producto
        for (Integer productoId : productosIds) {
            Producto producto = productoRepository.findById(productoId)
                    .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + productoId));
            
            // Verificar que el producto pertenece a la tienda
            if (!producto.getTienda().getId().equals(tiendaId)) {
                throw new RuntimeException("El producto " + producto.getNombre() + " no pertenece a tu tienda");
            }
            
            // Crear potencialización sin cambiar el precio del producto
            ProductoPotenciado potenciado = new ProductoPotenciado(
                    producto,
                    tienda,
                    producto.getPrecio(), // precio original
                    producto.getPrecio(), // precio promocional = precio original (sin descuento)
                    producto.getPrecio(), // precio mostrado = precio original
                    tipoPromocion,
                    PRECIO_BASE_POTENCIACION
            );
            
            productoPotenciadoRepository.save(potenciado);
        }
        
        return "¡" + productosIds.size() + " productos potenciados exitosamente! " +
               "Costo total: $" + montoTotal + ". Vigencia: 4 horas.";
    }

    /**
     * Potenciar productos de una tienda
     */
    public String potenciarProductos(Integer tiendaId, List<Integer> productosIds, 
                                   List<BigDecimal> preciosPromocionales, 
                                   List<BigDecimal> preciosMostrados,
                                   List<TipoPromocion> tiposPromocion) {
        
        // Validaciones
        if (productosIds.size() > 5) {
            throw new RuntimeException("Solo puedes potenciar máximo 5 productos");
        }
        
        if (productosIds.size() != preciosPromocionales.size() || 
            productosIds.size() != preciosMostrados.size() ||
            productosIds.size() != tiposPromocion.size()) {
            throw new RuntimeException("Datos inconsistentes en la solicitud");
        }
        
        Tienda tienda = tiendaRepository.findById(tiendaId)
                .orElseThrow(() -> new RuntimeException("Tienda no encontrada"));
        
        LocalDateTime ahora = LocalDateTime.now();
        
        // Verificar límite de productos activos
        long productosActivos = productoPotenciadoRepository.countProductosActivosByTienda(tienda, ahora);
        if (productosActivos + productosIds.size() > 5) {
            throw new RuntimeException("Ya tienes productos potenciados activos. Máximo 5 por tienda.");
        }
        
        BigDecimal montoTotal = PRECIO_BASE_POTENCIACION.multiply(new BigDecimal(productosIds.size()));
        
        // Crear potencializaciones
        for (int i = 0; i < productosIds.size(); i++) {
            Integer productoId = productosIds.get(i);
            
            // Verificar que el producto no esté ya potenciado
            List<ProductoPotenciado> yaExiste = productoPotenciadoRepository
                    .findByProductoVigente(productoId, ahora);
            if (!yaExiste.isEmpty()) {
                throw new RuntimeException("El producto con ID " + productoId + " ya está potenciado");
            }
            
            Producto producto = productoRepository.findById(productoId)
                    .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + productoId));
            
            // Verificar que el producto pertenezca a la tienda
            if (!producto.getTienda().getId().equals(tiendaId)) {
                throw new RuntimeException("El producto no pertenece a tu tienda");
            }
            
            ProductoPotenciado potenciado = new ProductoPotenciado(
                    producto,
                    tienda,
                    producto.getPrecio(),
                    preciosPromocionales.get(i),
                    preciosMostrados.get(i),
                    tiposPromocion.get(i),
                    PRECIO_BASE_POTENCIACION
            );
            
            productoPotenciadoRepository.save(potenciado);
        }
        
        return "Productos potenciados exitosamente. Total: $" + montoTotal + 
               ". Vigencia: 4 horas desde ahora.";
    }
    
    /**
     * Obtener productos potenciados de una tienda específica
     */
    public List<ProductoPotenciadoDTO> getProductosPotenciadosPorTienda(Integer tiendaId) {
        Tienda tienda = tiendaRepository.findById(tiendaId)
                .orElseThrow(() -> new RuntimeException("Tienda no encontrada"));
        
        LocalDateTime ahora = LocalDateTime.now();
        List<ProductoPotenciado> productos = productoPotenciadoRepository.findByTiendaVigentes(tienda, ahora);
        
        return productos.stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Obtener historial de potencializaciones de una tienda
     */
    public List<ProductoPotenciadoDTO> getHistorialPotencializaciones(Integer tiendaId) {
        Tienda tienda = tiendaRepository.findById(tiendaId)
                .orElseThrow(() -> new RuntimeException("Tienda no encontrada"));
        
        List<ProductoPotenciado> productos = productoPotenciadoRepository.findHistorialByTienda(tienda);
        
        return productos.stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Desactivar producto potenciado
     */
    public void desactivarProductoPotenciado(Long potenciadoId, Integer tiendaId) {
        ProductoPotenciado potenciado = productoPotenciadoRepository.findById(potenciadoId)
                .orElseThrow(() -> new RuntimeException("Potencialización no encontrada"));
        
        if (!potenciado.getTienda().getId().equals(tiendaId)) {
            throw new RuntimeException("No tienes permisos para desactivar esta potencialización");
        }
        
        potenciado.setActivo(false);
        productoPotenciadoRepository.save(potenciado);
    }
    
    /**
     * Tarea automática para desactivar productos expirados
     */
    public int desactivarProductosExpirados() {
        LocalDateTime ahora = LocalDateTime.now();
        return productoPotenciadoRepository.desactivarProductosExpirados(ahora);
    }
    
    /**
     * Convertir entidad a DTO
     */
    private ProductoPotenciadoDTO convertirADTO(ProductoPotenciado potenciado) {
        ProductoPotenciadoDTO dto = new ProductoPotenciadoDTO();
        
        dto.setId(potenciado.getId());
        dto.setProductoId(potenciado.getProducto().getId());
        dto.setNombreProducto(potenciado.getProducto().getNombre());
        dto.setImagenProducto(potenciado.getProducto().getImagenUrl());
        dto.setTiendaId(potenciado.getTienda().getId());
        dto.setNombreTienda(potenciado.getTienda().getNombre());
        dto.setLogoTienda(potenciado.getTienda().getLogoUrl());
        dto.setPrecioOriginal(potenciado.getPrecioOriginal());
        dto.setPrecioPromocional(potenciado.getPrecioPromocional());
        dto.setPrecioMostrado(potenciado.getPrecioMostrado());
        dto.setTipoPromocion(potenciado.getTipoPromocion());
        dto.setEtiquetaPromocion(potenciado.getTipoPromocion().getEtiqueta());
        dto.setDescripcionPromocion(potenciado.getTipoPromocion().getDescripcion());
        dto.setFechaInicio(potenciado.getFechaInicio());
        dto.setFechaFin(potenciado.getFechaFin());
        dto.setHorasRestantes(potenciado.getHorasRestantes());
        dto.setDescuentoPorcentaje(potenciado.getDescuentoPorcentaje());
        dto.setVigente(potenciado.isVigente());
        
        return dto;
    }
    
    /**
     * Cancelar potenciación de productos activos
     */
    public List<ProductoPotenciadoDTO> cancelarPotenciacion(List<Integer> productosIds, Integer tiendaId) {
        LocalDateTime ahora = LocalDateTime.now();
        
        // Buscar potenciaciones activas de estos productos para esta tienda
        List<ProductoPotenciado> potenciacionesActivas = productoPotenciadoRepository
                .findByProductoIdInAndTiendaIdAndActivoTrueAndFechaFinAfter(productosIds, tiendaId, ahora);
        
        if (potenciacionesActivas.isEmpty()) {
            throw new RuntimeException("No se encontraron potenciaciones activas para los productos seleccionados");
        }
        
        // Desactivar las potenciaciones
        List<ProductoPotenciadoDTO> canceladas = potenciacionesActivas.stream()
                .map(potenciacion -> {
                    potenciacion.setActivo(false);
                    ProductoPotenciado guardado = productoPotenciadoRepository.save(potenciacion);
                    return convertirADTO(guardado);
                })
                .collect(Collectors.toList());
        
        return canceladas;
    }

    /**
     * Calcular costo de potencialización
     */
    public BigDecimal calcularCostoPotencializacion(int cantidadProductos) {
        if (cantidadProductos > 5) {
            throw new RuntimeException("Máximo 5 productos por potencialización");
        }
        return PRECIO_BASE_POTENCIACION.multiply(new BigDecimal(cantidadProductos));
    }
}