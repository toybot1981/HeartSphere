package com.heartsphere.controller;

import com.heartsphere.entity.CustomScenario;
import com.heartsphere.repository.CustomScenarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/custom-scenarios")
public class CustomScenarioController {

    @Autowired
    private CustomScenarioRepository customScenarioRepository;

    @GetMapping
    public ResponseEntity<List<CustomScenario>> getAllCustomScenarios() {
        List<CustomScenario> scenarios = customScenarioRepository.findAll();
        return new ResponseEntity<>(scenarios, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomScenario> getCustomScenarioById(@PathVariable String id) {
        Optional<CustomScenario> scenario = customScenarioRepository.findById(id);
        return scenario.map(value -> new ResponseEntity<>(value, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PostMapping
    public ResponseEntity<CustomScenario> createCustomScenario(@RequestBody CustomScenario customScenario) {
        CustomScenario savedScenario = customScenarioRepository.save(customScenario);
        return new ResponseEntity<>(savedScenario, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomScenario> updateCustomScenario(@PathVariable String id, @RequestBody CustomScenario customScenario) {
        if (!customScenarioRepository.existsById(id)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        customScenario.setId(id);
        CustomScenario updatedScenario = customScenarioRepository.save(customScenario);
        return new ResponseEntity<>(updatedScenario, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCustomScenario(@PathVariable String id) {
        if (!customScenarioRepository.existsById(id)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        customScenarioRepository.deleteById(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}