package com.heartsphere.config;

import com.heartsphere.security.UserDetailsServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class WebSecurityConfig {

    @Autowired
    UserDetailsServiceImpl userDetailsService;

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();

        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());

        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 启用默认的CORS配置，使用application.yml中的配置
                .cors(cors -> cors.configurationSource(request -> {
                    // 创建默认的CORS配置
                    CorsConfiguration config = new CorsConfiguration();
                    // 允许所有来源
                    config.addAllowedOriginPattern("*");
                    // 允许所有HTTP方法
                    config.addAllowedMethod("*");
                    // 允许所有请求头
                    config.addAllowedHeader("*");
                    // 允许携带凭证
                    config.setAllowCredentials(true);
                    // 预检请求的缓存时间
                    config.setMaxAge(3600L);
                    return config;
                }))
                // 禁用CSRF
                .csrf(csrf -> csrf.disable())
                // 设置会话管理为无状态
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // 配置授权规则
                .authorizeHttpRequests(auth -> auth
                        // 允许公开访问的端点
                        .requestMatchers("/api/auth/**", "/api/wechat/**", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        // 允许所有OPTIONS请求
                        .requestMatchers(request -> "OPTIONS".equals(request.getMethod())).permitAll()
                        // 允许所有请求，方便开发测试
                        .anyRequest().permitAll());

        // 配置认证提供者
        http.authenticationProvider(authenticationProvider());

        return http.build();
    }
}