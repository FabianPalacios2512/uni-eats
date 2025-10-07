package com.remington.unieats.marketplace.controller;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.remington.unieats.marketplace.dto.ProductoPotenciadoDTO;
import com.remington.unieats.marketplace.entity.TipoPromocion;
import com.remington.unieats.marketplace.model.entity.Tienda;
import com.remington.unieats.marketplace.model.entity.Usuario;
import com.remington.unieats.marketplace.model.repository.UsuarioRepository;
import com.remington.unieats.marketplace.service.ProductoPotenciadoService;
import com.remington.unieats.marketplace.service.VendedorService;

@RestController
@RequestMapping("/api/productos-potenciados")
public class ProductoPotenciadoController {
    
    @Autowired
    private ProductoPotenciadoService productoPotenciadoService;
    
    @Autowired
    private UsuarioRepository usuarioRepository;
    
    @Autowired
    private VendedorService vendedorService;
    
    /**
     * Obtener productos potenciados activos (para compradores)
     */
    @GetMapping("/activos")
    public ResponseEntity<List<ProductoPotenciadoDTO>> getProductosActivos() {
        try {
            List<ProductoPotenciadoDTO> productos = productoPotenciadoService.getProductosPotenciadosActivos();
            return ResponseEntity.ok(productos);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Potenciar productos (para vendedores) - Versión simplificada
     */
    @PostMapping("/potenciar")
    public ResponseEntity<Map<String, Object>> potenciarProductos(@RequestBody Map<String, Object> request, 
                                                                 Authentication authentication) {
        try {
            // Obtener usuario y tienda autenticados
            String correo = authentication.getName();
            Usuario vendedor = usuarioRepository.findByCorreo(correo)
                    .orElseThrow(() -> new RuntimeException("Vendedor no encontrado"));
            
            Optional<Tienda> tiendaOpt = vendedorService.findTiendaByVendedor(vendedor);
            if (tiendaOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes una tienda registrada"));
            }
            
            Tienda tienda = tiendaOpt.get();
            Integer tiendaId = tienda.getId();
            
            @SuppressWarnings("unchecked")
            List<Integer> productosIds = (List<Integer>) request.get("productosIds");
            String tipoPromocionStr = (String) request.get("tipoPromocion");
            
            // Validar parámetros básicos
            if (productosIds == null || productosIds.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Debe seleccionar al menos un producto"));
            }
            
            if (tipoPromocionStr == null || tipoPromocionStr.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Debe seleccionar un tipo de promoción"));
            }
            
            TipoPromocion tipoPromocion = TipoPromocion.valueOf(tipoPromocionStr);
            
            String resultado = productoPotenciadoService.potenciarProductosSimple(
                    tiendaId, productosIds, tipoPromocion);
            
            return ResponseEntity.ok(Map.of(
                "mensaje", resultado,
                "productosIds", productosIds,
                "tipoPromocion", tipoPromocion.name(),
                "costo", productosIds.size() * 5000
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tipo de promoción inválido: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Obtener productos potenciados de la tienda del usuario autenticado
     */
    @GetMapping("/tienda/mis-promociones")
    public ResponseEntity<List<ProductoPotenciadoDTO>> getMisPromocionesActivas(Authentication authentication) {
        try {
            // Obtener usuario y tienda autenticados
            String correo = authentication.getName();
            Usuario vendedor = usuarioRepository.findByCorreo(correo)
                    .orElseThrow(() -> new RuntimeException("Vendedor no encontrado"));
            
            Optional<Tienda> tiendaOpt = vendedorService.findTiendaByVendedor(vendedor);
            if (tiendaOpt.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }
            
            List<ProductoPotenciadoDTO> productos = productoPotenciadoService.getProductosPotenciadosPorTienda(tiendaOpt.get().getId());
            return ResponseEntity.ok(productos);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Obtener historial de potencializaciones
     */
    @GetMapping("/historial/{tiendaId}")
    public ResponseEntity<List<ProductoPotenciadoDTO>> getHistorial(@PathVariable Integer tiendaId) {
        try {
            List<ProductoPotenciadoDTO> historial = productoPotenciadoService.getHistorialPotencializaciones(tiendaId);
            return ResponseEntity.ok(historial);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Desactivar producto potenciado
     */
    @DeleteMapping("/{potenciadoId}/tienda/{tiendaId}")
    public ResponseEntity<Map<String, String>> desactivarProducto(@PathVariable Long potenciadoId, 
                                                                @PathVariable Integer tiendaId) {
        try {
            productoPotenciadoService.desactivarProductoPotenciado(potenciadoId, tiendaId);
            return ResponseEntity.ok(Map.of("mensaje", "Producto desactivado exitosamente"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Obtener tipos de promoción disponibles
     */
    @GetMapping("/tipos-promocion")
    public ResponseEntity<List<Map<String, String>>> getTiposPromocion() {
        try {
            List<Map<String, String>> tipos = Arrays.stream(TipoPromocion.values())
                    .map(tipo -> Map.of(
                            "valor", tipo.name(),
                            "etiqueta", tipo.getEtiqueta(),
                            "descripcion", tipo.getDescripcion()
                    ))
                    .toList();
            return ResponseEntity.ok(tipos);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Cancelar potenciación de productos (para vendedores)
     */
    @DeleteMapping("/cancelar")
    public ResponseEntity<Map<String, Object>> cancelarPotenciacion(
            @RequestParam List<Integer> productosIds,
            Authentication authentication) {
        try {
            // Obtener el vendedor autenticado
            String correo = authentication.getName();
            Optional<Usuario> usuarioOpt = usuarioRepository.findByCorreo(correo);
            
            if (usuarioOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
            }
            
            Usuario vendedor = usuarioOpt.get();
            Optional<Tienda> tiendaOpt = vendedorService.findTiendaByVendedor(vendedor);
            
            if (tiendaOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Tienda no encontrada"));
            }
            
            Tienda tienda = tiendaOpt.get();
            
            // Cancelar potenciación
            List<ProductoPotenciadoDTO> potenciacionesCanceladas = productoPotenciadoService.cancelarPotenciacion(productosIds, tienda.getId());
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "mensaje", "Potenciación cancelada exitosamente",
                    "productosCancelados", potenciacionesCanceladas.size(),
                    "productos", potenciacionesCanceladas
            ));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Calcular costo de potencialización
     */
    @GetMapping("/costo/{cantidadProductos}")
    public ResponseEntity<Map<String, Object>> calcularCosto(@PathVariable int cantidadProductos) {
        try {
            BigDecimal costo = productoPotenciadoService.calcularCostoPotencializacion(cantidadProductos);
            return ResponseEntity.ok(Map.of(
                    "cantidadProductos", cantidadProductos,
                    "costoTotal", costo,
                    "costoPorProducto", new BigDecimal("5000.00"),
                    "duracionHoras", 4
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}