package com.heartsphere.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "characters")
public class Character {

    @Id
    @Column(name = "id", nullable = false, length = 36)
    private String id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "age", nullable = false)
    private int age;

    @Column(name = "era", length = 100)
    private String era;

    @Column(name = "role", nullable = false, length = 100)
    private String role;

    @Column(name = "bio", nullable = false, columnDefinition = "TEXT")
    private String bio;

    @Column(name = "avatar_url", nullable = false, length = 255)
    private String avatarUrl;

    @Column(name = "background_url", nullable = false, length = 255)
    private String backgroundUrl;

    @Column(name = "system_instruction", nullable = false, columnDefinition = "TEXT")
    private String systemInstruction;

    @Column(name = "theme_color", nullable = false, length = 20)
    private String themeColor;

    @Column(name = "color_accent", nullable = false, length = 20)
    private String colorAccent;

    @Column(name = "first_message", nullable = false, columnDefinition = "TEXT")
    private String firstMessage;

    @Column(name = "voice_name", nullable = false, length = 100)
    private String voiceName;

    @Column(name = "mbti", length = 10)
    private String mbti;

    @Column(name = "tags", columnDefinition = "JSON")
    private String tags;

    @Column(name = "speech_style", columnDefinition = "TEXT")
    private String speechStyle;

    @Column(name = "catchphrases", columnDefinition = "JSON")
    private String catchphrases;

    @Column(name = "secrets", columnDefinition = "TEXT")
    private String secrets;

    @Column(name = "motivations", columnDefinition = "TEXT")
    private String motivations;

    @Column(name = "relationships", columnDefinition = "TEXT")
    private String relationships;

    @ManyToMany(mappedBy = "characters")
    @JsonIgnore
    private Set<WorldScene> scenes;

    @ManyToMany(mappedBy = "customCharacters")
    @JsonIgnore
    private Set<WorldScene> customScenes;
}