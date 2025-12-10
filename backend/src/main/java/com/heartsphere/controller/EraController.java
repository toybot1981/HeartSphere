package com.heartsphere.controller;

import com.heartsphere.entity.Era;
import com.heartsphere.entity.User;
import com.heartsphere.repository.EraRepository;
import com.heartsphere.repository.UserRepository;
import com.heartsphere.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/eras")
public class EraController {

    @Autowired
    private EraRepository eraRepository;

    @Autowired
    private UserRepository userRepository;

    // 获取当前用户的所有时代
    @GetMapping
    public ResponseEntity<List<Era>> getAllEras() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<Era> eras = eraRepository.findByUserId(userDetails.getId());
        return ResponseEntity.ok(eras);
    }

    // 获取指定ID的时代
    @GetMapping("/{id}")
    public ResponseEntity<Era> getEraById(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        Era era = eraRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Era not found with id: " + id));

        // 确保用户只能访问自己的时代
        if (!era.getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(era);
    }

    // 获取指定世界的所有时代
    @GetMapping("/world/{worldId}")
    public ResponseEntity<List<Era>> getErasByWorldId(@PathVariable Long worldId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<Era> eras = eraRepository.findByWorldId(worldId);
        // 过滤出当前用户的时代
        eras = eras.stream().filter(era -> era.getUser().getId().equals(userDetails.getId())).toList();
        return ResponseEntity.ok(eras);
    }

    // 创建新时代
    @PostMapping
    public ResponseEntity<Era> createEra(@RequestBody Era era) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userDetails.getId()));

        era.setUser(user);
        Era savedEra = eraRepository.save(era);
        return ResponseEntity.ok(savedEra);
    }

    // 更新指定ID的时代
    @PutMapping("/{id}")
    public ResponseEntity<Era> updateEra(@PathVariable Long id, @RequestBody Era eraDetails) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        Era era = eraRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Era not found with id: " + id));

        // 确保用户只能更新自己的时代
        if (!era.getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).build();
        }

        era.setName(eraDetails.getName());
        era.setDescription(eraDetails.getDescription());
        era.setStartYear(eraDetails.getStartYear());
        era.setEndYear(eraDetails.getEndYear());
        era.setWorld(eraDetails.getWorld());

        Era updatedEra = eraRepository.save(era);
        return ResponseEntity.ok(updatedEra);
    }

    // 删除指定ID的时代
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEra(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        Era era = eraRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Era not found with id: " + id));

        // 确保用户只能删除自己的时代
        if (!era.getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).build();
        }

        eraRepository.delete(era);
        return ResponseEntity.noContent().build();
    }
}