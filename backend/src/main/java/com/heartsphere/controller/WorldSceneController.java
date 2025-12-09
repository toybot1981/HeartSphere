package com.heartsphere.controller;

import com.heartsphere.entity.WorldScene;
import com.heartsphere.repository.WorldSceneRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/world-scenes")
public class WorldSceneController {

    @Autowired
    private WorldSceneRepository worldSceneRepository;

    @GetMapping
    public ResponseEntity<List<WorldScene>> getAllWorldScenes() {
        List<WorldScene> scenes = worldSceneRepository.findAll();
        return new ResponseEntity<>(scenes, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorldScene> getWorldSceneById(@PathVariable String id) {
        Optional<WorldScene> scene = worldSceneRepository.findById(id);
        return scene.map(value -> new ResponseEntity<>(value, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PostMapping
    public ResponseEntity<WorldScene> createWorldScene(@RequestBody WorldScene worldScene) {
        WorldScene savedScene = worldSceneRepository.save(worldScene);
        return new ResponseEntity<>(savedScene, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorldScene> updateWorldScene(@PathVariable String id, @RequestBody WorldScene worldScene) {
        if (!worldSceneRepository.existsById(id)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        worldScene.setId(id);
        WorldScene updatedScene = worldSceneRepository.save(worldScene);
        return new ResponseEntity<>(updatedScene, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorldScene(@PathVariable String id) {
        if (!worldSceneRepository.existsById(id)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        worldSceneRepository.deleteById(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}