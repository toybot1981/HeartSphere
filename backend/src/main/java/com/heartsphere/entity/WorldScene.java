package com.heartsphere.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "world_scenes")
public class WorldScene {

    @Id
    @Column(name = "id", nullable = false, length = 36)
    private String id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url", nullable = false, length = 255)
    private String imageUrl;

    @ManyToOne
    @JoinColumn(name = "main_story_character_id")
    private Character mainStoryCharacter;

    @ManyToMany
    @JoinTable(
            name = "scene_character_relations",
            joinColumns = @JoinColumn(name = "scene_id"),
            inverseJoinColumns = @JoinColumn(name = "character_id")
    )
    private Set<Character> characters;

    @ManyToMany
    @JoinTable(
            name = "custom_character_relations",
            joinColumns = @JoinColumn(name = "scene_id"),
            inverseJoinColumns = @JoinColumn(name = "character_id")
    )
    private Set<Character> customCharacters;

    @OneToMany(mappedBy = "worldScene", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EraMemory> memories;

    @OneToMany(mappedBy = "scene", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CustomScenario> customScenarios;
}