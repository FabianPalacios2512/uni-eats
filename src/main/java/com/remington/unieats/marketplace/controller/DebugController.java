package com.remington.unieats.marketplace.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 🔧 Controlador temporal para debuggear IDs de usuarios
 */
@RestController
@RequestMapping("/api/debug")
@CrossOrigin(origins = "*")
public class DebugController {
    
    @Autowired
    private DataSource dataSource;
    
    /**
     * 🔍 Buscar usuarios especializados por correo
     */
    @GetMapping("/usuarios-especializados")
    public ResponseEntity<?> getUsuariosEspecializados() {
        try {
            List<Map<String, Object>> usuarios = new ArrayList<>();
            
            String sql = "SELECT id, nombre, correo, tipo_usuario FROM usuarios WHERE correo IN (?, ?)";
            
            try (Connection conn = dataSource.getConnection();
                 PreparedStatement stmt = conn.prepareStatement(sql)) {
                
                stmt.setString(1, "bebidas@unieats.com");
                stmt.setString(2, "almuerzo@unieats.com");
                
                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        Map<String, Object> usuario = new HashMap<>();
                        usuario.put("id", rs.getLong("id"));
                        usuario.put("nombre", rs.getString("nombre"));
                        usuario.put("correo", rs.getString("correo"));
                        usuario.put("tipo_usuario", rs.getString("tipo_usuario"));
                        usuarios.add(usuario);
                    }
                }
            }
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "usuarios", usuarios,
                "total", usuarios.size()
            ));
            
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }
}