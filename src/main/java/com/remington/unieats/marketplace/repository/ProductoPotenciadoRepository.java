package com.remington.unieats.marketplace.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.remington.unieats.marketplace.entity.ProductoPotenciado;
import com.remington.unieats.marketplace.model.entity.Tienda;

@Repository
public interface ProductoPotenciadoRepository extends JpaRepository<ProductoPotenciado, Long> {
    
    // Obtener productos potenciados activos y vigentes
    @Query("SELECT pp FROM ProductoPotenciado pp WHERE pp.activo = true " +
           "AND pp.fechaInicio <= :ahora AND pp.fechaFin > :ahora " +
           "ORDER BY pp.fechaCreacion DESC")
    List<ProductoPotenciado> findProductosActivosVigentes(@Param("ahora") LocalDateTime ahora);
    
    // Obtener productos potenciados de una tienda específica
    @Query("SELECT pp FROM ProductoPotenciado pp WHERE pp.tienda = :tienda " +
           "AND pp.activo = true AND pp.fechaInicio <= :ahora AND pp.fechaFin > :ahora " +
           "ORDER BY pp.fechaCreacion DESC")
    List<ProductoPotenciado> findByTiendaVigentes(@Param("tienda") Tienda tienda, 
                                                 @Param("ahora") LocalDateTime ahora);
    
    // Contar productos potenciados activos de una tienda
    @Query("SELECT COUNT(pp) FROM ProductoPotenciado pp WHERE pp.tienda = :tienda " +
           "AND pp.activo = true AND pp.fechaInicio <= :ahora AND pp.fechaFin > :ahora")
    long countProductosActivosByTienda(@Param("tienda") Tienda tienda, 
                                      @Param("ahora") LocalDateTime ahora);
    
    // Obtener historial de potencializaciones de una tienda
    @Query("SELECT pp FROM ProductoPotenciado pp WHERE pp.tienda = :tienda " +
           "ORDER BY pp.fechaCreacion DESC")
    List<ProductoPotenciado> findHistorialByTienda(@Param("tienda") Tienda tienda);
    
    // Verificar si un producto específico ya está potenciado
    @Query("SELECT pp FROM ProductoPotenciado pp WHERE pp.producto.id = :productoId " +
           "AND pp.activo = true AND pp.fechaInicio <= :ahora AND pp.fechaFin > :ahora")
    List<ProductoPotenciado> findByProductoVigente(@Param("productoId") Integer productoId, 
                                                  @Param("ahora") LocalDateTime ahora);
    
    // Desactivar productos expirados (para tarea automática)
    @Query("UPDATE ProductoPotenciado pp SET pp.activo = false " +
           "WHERE pp.activo = true AND pp.fechaFin <= :ahora")
    int desactivarProductosExpirados(@Param("ahora") LocalDateTime ahora);
    
    // Obtener productos próximos a expirar (para notificaciones)
    @Query("SELECT pp FROM ProductoPotenciado pp WHERE pp.activo = true " +
           "AND pp.fechaFin BETWEEN :ahora AND :proximaHora " +
           "ORDER BY pp.fechaFin ASC")
    List<ProductoPotenciado> findProductosProximosAExpirar(@Param("ahora") LocalDateTime ahora,
                                                          @Param("proximaHora") LocalDateTime proximaHora);
    
    // Buscar potenciaciones activas por IDs de productos y tienda
    @Query("SELECT pp FROM ProductoPotenciado pp WHERE pp.producto.id IN :productosIds " +
           "AND pp.tienda.id = :tiendaId AND pp.activo = true AND pp.fechaFin > :ahora " +
           "ORDER BY pp.fechaCreacion DESC")
    List<ProductoPotenciado> findByProductoIdInAndTiendaIdAndActivoTrueAndFechaFinAfter(
            @Param("productosIds") List<Integer> productosIds,
            @Param("tiendaId") Integer tiendaId,
            @Param("ahora") LocalDateTime ahora);
}