package com.remington.unieats.marketplace.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers(
                    "/registro",
                    "/forgot-password",
                    "/reset-password",
                    "/css/**",
                    "/js/**",
                    "/img/**",
                    "/uploads/**",
                    "/api/marketplace/**", // Permitimos ver tiendas sin iniciar sesión
                    "/api/auth/**", // ✅ Permitir endpoints de autenticación (login/register) sin autenticación
                    "/api/recomendaciones/health", // ✅ Permitir health check ML sin autenticación
                    "/api/ml-monitor/test-recomendaciones/**", // ✅ Permitir endpoint de test ML
                    "/api/ml-monitor/test-minimo/**", // ✅ Permitir endpoint de test mínimo
                    "/api/ml-monitor/recomendaciones/**", // ✅ Permitir endpoint de recomendaciones ML
                    "/error/**", // Permitir páginas de error
                    "/custom-logout" // Permitir logout personalizado
                ).permitAll()
                .requestMatchers("/admin/**").hasRole("ADMIN_PLATAFORMA")
                .requestMatchers("/vendedor/**", "/api/vendedor/**").hasRole("VENDEDOR")
                .requestMatchers("/api/pedidos/crear").authenticated()
                .anyRequest().authenticated()
            )
            .exceptionHandling(exceptions -> exceptions
                .accessDeniedPage("/error/403") // Página personalizada para errores 403
            )
            .formLogin(form -> form
                .loginPage("/login")
                .defaultSuccessUrl("/", true)
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessUrl("/login?logout")
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
                .permitAll()
            );

        // ↓↓↓ CONFIGURACIÓN CSRF PARA SOLUCIONAR ERROR 403 EN LOGOUT ↓↓↓
        http.csrf(csrf -> csrf
            .ignoringRequestMatchers("/api/**", "/logout", "/custom-logout", "/login") // Deshabilita CSRF para API, logout y login
        );

        return http.build();
    }
}