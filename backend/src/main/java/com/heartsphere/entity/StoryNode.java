package com.heartsphere.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "story_nodes")
public class StoryNode {

    @Id
    @Column(name = "id", nullable = false, length = 36)
    private String id;

    @ManyToOne
    @JoinColumn(name = "scenario_id", nullable = false)
    private CustomScenario scenario;

    @Column(name = "title", nullable = false, length = 100)
    private String title;

    @Column(name = "prompt", nullable = false, columnDefinition = "TEXT")
    private String prompt;

    @Column(name = "background_hint", columnDefinition = "TEXT")
    private String backgroundHint;

    @OneToMany(mappedBy = "storyNode", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StoryOption> options;
}