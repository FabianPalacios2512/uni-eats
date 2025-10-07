package com.remington.unieats.marketplace.repository;

import com.remington.unieats.marketplace.entity.RecomendacionMLMinima;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 🧪 Repositorio MÍNIMO para testing ML
 */
@Repository
public interface RecomendacionMLMinimaRepository extends JpaRepository<RecomendacionMLMinima, Long> {

    /**
     * Obtener recomendaciones para un usuario - método simple
     */
    List<RecomendacionMLMinima> findByUsuarioId(Long usuarioId);

    /**
     * Obtener recomendaciones para un usuario ordenadas por score
     */
    @Query("SELECT r FROM RecomendacionMLMinima r " +
           "WHERE r.usuarioId = :usuarioId " +
           "ORDER BY r.scoreConfianza DESC")
    List<RecomendacionMLMinima> findByUsuarioIdOrderByScoreConfianzaDesc(@Param("usuarioId") Integer usuarioId);
}