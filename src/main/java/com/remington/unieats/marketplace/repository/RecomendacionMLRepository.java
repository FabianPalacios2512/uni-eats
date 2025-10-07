package com.remington.unieats.marketplace.repository;

import com.remington.unieats.marketplace.entity.RecomendacionML;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 🎯 Repositorio para gestionar recomendaciones ML generadas
 */
@Repository
public interface RecomendacionMLRepository extends JpaRepository<RecomendacionML, Long> {

    /**
     * Obtener recomendaciones activas para un usuario
     */
    @Query("SELECT r FROM RecomendacionML r " +
           "WHERE r.usuarioId = :usuarioId " +
           "ORDER BY r.puntuacionPredicha DESC")
    List<RecomendacionML> findRecomendacionesActivasByUsuario(@Param("usuarioId") Integer usuarioId);

    /**
     * Obtener top recomendaciones para un usuario
     */
    @Query("SELECT r FROM RecomendacionML r " +
           "WHERE r.usuarioId = :usuarioId " +
           "ORDER BY r.puntuacionPredicha DESC " +
           "LIMIT :limite")
    List<RecomendacionML> findTopRecomendacionesByUsuario(@Param("usuarioId") Integer usuarioId,
                                                         @Param("limite") int limite);

    /**
     * Obtener recomendaciones por tipo
     */
    List<RecomendacionML> findByUsuarioIdAndTipoRecomendacionOrderByPuntuacionPredichaDesc(
        Integer usuarioId, RecomendacionML.TipoRecomendacion tipo);

    /**
     * Obtener recomendaciones no mostradas aún
     */
    List<RecomendacionML> findByUsuarioIdAndVecesMostradaIsNullOrderByPuntuacionPredichaDesc(Integer usuarioId);

    /**
     * Verificar si ya existe recomendación para usuario-producto
     */
    boolean existsByUsuarioIdAndProductoId(Integer usuarioId, Integer productoId);

    /**
     * TEMPORARILY DISABLED - Method uses fechaExpiracion which doesn't exist in database
     * Eliminar recomendaciones expiradas
     */
    // @Query("DELETE FROM RecomendacionML r WHERE r.fechaExpiracion < :now")
    // void eliminarRecomendacionesExpiradas(@Param("now") LocalDateTime now);

    /**
     * Obtener estadísticas de efectividad de recomendaciones
     */
    @Query("SELECT r.tipoRecomendacion, " +
           "COUNT(*) as total, " +
           "SUM(CASE WHEN r.vecesMostrada IS NOT NULL AND r.vecesMostrada > 0 THEN 1 ELSE 0 END) as mostradas, " +
           "SUM(CASE WHEN r.fueAceptada = true THEN 1 ELSE 0 END) as aceptadas " +
           "FROM RecomendacionML r " +
           "WHERE r.usuarioId = :usuarioId " +
           "GROUP BY r.tipoRecomendacion")
    List<Object[]> getEstadisticasEfectividad(@Param("usuarioId") Integer usuarioId);

    /**
     * DISABLED: Obtener recomendaciones por algoritmo usado - algoritmo_usado column doesn't exist
     */
    // List<RecomendacionML> findByUsuarioIdAndAlgoritmoUsadoOrderByPuntuacionPredichaDesc(
    //     Integer usuarioId, RecomendacionML.AlgoritmoML algoritmo);

    /**
     * Buscar recomendaciones recientes para un usuario
     */
    @Query("SELECT r FROM RecomendacionML r " +
           "WHERE r.usuarioId = :usuarioId " +
           "AND r.fechaGeneracion >= :fechaDesde " +
           "ORDER BY r.fechaGeneracion DESC")
    List<RecomendacionML> findRecomendacionesRecientes(@Param("usuarioId") Integer usuarioId, 
                                                      @Param("fechaDesde") LocalDateTime fechaDesde);

    /**
     * Eliminar recomendaciones antiguas por usuario
     */
    @Modifying
    @Query("DELETE FROM RecomendacionML r WHERE r.usuarioId = :usuarioId AND r.fechaGeneracion < :fechaLimite")
    void deleteByUsuarioIdAndFechaCreacionBefore(@Param("usuarioId") Integer usuarioId, @Param("fechaLimite") LocalDateTime fechaLimite);
}