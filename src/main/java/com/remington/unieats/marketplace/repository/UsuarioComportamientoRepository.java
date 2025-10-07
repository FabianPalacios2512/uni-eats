package com.remington.unieats.marketplace.repository;

import com.remington.unieats.marketplace.entity.UsuarioComportamiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 📊 Repositorio para gestionar el comportamiento de usuarios y patrones de compra
 */
@Repository
public interface UsuarioComportamientoRepository extends JpaRepository<UsuarioComportamiento, Long> {

    /**
     * Buscar comportamiento específico de un usuario con un producto
     */
    Optional<UsuarioComportamiento> findByUsuarioIdAndProductoId(Integer usuarioId, Integer productoId);

    /**
     * Obtener todos los comportamientos de un usuario ordenados por afinidad
     */
    List<UsuarioComportamiento> findByUsuarioIdOrderByPuntuacionAfinidadDesc(Integer usuarioId);

    /**
     * Obtener productos favoritos de un usuario
     */
    List<UsuarioComportamiento> findByUsuarioIdAndEsFavoritoTrueOrderByPuntuacionAfinidadDesc(Integer usuarioId);

    /**
     * Obtener comportamientos por categoría de un usuario
     */
    List<UsuarioComportamiento> findByUsuarioIdAndCategoriaProductoOrderByFrecuenciaCompraDesc(Integer usuarioId, String categoria);

    /**
     * Obtener las categorías más compradas por un usuario
     */
    @Query("SELECT uc.categoriaProducto, SUM(uc.frecuenciaCompra) as totalCompras " +
           "FROM UsuarioComportamiento uc " +
           "WHERE uc.usuarioId = :usuarioId " +
           "GROUP BY uc.categoriaProducto " +
           "ORDER BY totalCompras DESC")
    List<Object[]> findTopCategoriasByUsuario(@Param("usuarioId") Integer usuarioId);

    /**
     * Obtener las tiendas más frecuentadas por un usuario
     */
    @Query("SELECT uc.tiendaId, SUM(uc.frecuenciaCompra) as totalCompras " +
           "FROM UsuarioComportamiento uc " +
           "WHERE uc.usuarioId = :usuarioId " +
           "GROUP BY uc.tiendaId " +
           "ORDER BY totalCompras DESC")
    List<Object[]> findTopTiendasByUsuario(@Param("usuarioId") Integer usuarioId);

    /**
     * Obtener usuarios con comportamiento similar (mismos productos/categorías)
     */
    @Query("SELECT uc2.usuarioId " +
           "FROM UsuarioComportamiento uc1, UsuarioComportamiento uc2 " +
           "WHERE uc1.usuarioId = :usuarioId " +
           "AND uc2.usuarioId != :usuarioId " +
           "AND (uc1.productoId = uc2.productoId OR uc1.categoriaProducto = uc2.categoriaProducto) " +
           "GROUP BY uc2.usuarioId " +
           "HAVING COUNT(*) >= :minSimilaridades " +
           "ORDER BY COUNT(*) DESC")
    List<Integer> findSimilarUsers(@Param("usuarioId") Integer usuarioId, 
                                  @Param("minSimilaridades") Integer minSimilaridades);

    /**
     * Obtener productos más comprados en una hora específica por un usuario
     */
    @Query("SELECT uc FROM UsuarioComportamiento uc " +
           "WHERE uc.usuarioId = :usuarioId " +
           "AND uc.horaPreferidaCompra = :hora " +
           "ORDER BY uc.frecuenciaCompra DESC")
    List<UsuarioComportamiento> findByUsuarioIdAndHoraPreferida(@Param("usuarioId") Integer usuarioId, 
                                                               @Param("hora") Integer hora);

    /**
     * Obtener estadísticas de compra de un usuario
     */
    @Query("SELECT COUNT(*), SUM(uc.frecuenciaCompra), AVG(uc.puntuacionAfinidad) " +
           "FROM UsuarioComportamiento uc " +
           "WHERE uc.usuarioId = :usuarioId")
    Object[] getEstadisticasUsuario(@Param("usuarioId") Integer usuarioId);

    /**
     * Buscar comportamientos por categoría ordenados por frecuencia
     */
    List<UsuarioComportamiento> findByUsuarioIdOrderByFrecuenciaCompraDesc(Integer usuarioId);
    /**
     * Buscar comportamientos por hora preferida de compra
     */
    @Query("SELECT uc FROM UsuarioComportamiento uc WHERE uc.usuarioId = :usuarioId AND uc.horaPreferidaCompra = :hora ORDER BY uc.puntuacionAfinidad DESC")
    List<UsuarioComportamiento> findByUsuarioIdAndHoraPreferidaCompra(@Param("usuarioId") Integer usuarioId, @Param("hora") Integer hora);
}