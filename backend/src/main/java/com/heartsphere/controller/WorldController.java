package com.heartsphere.controller;

import com.heartsphere.entity.User;
import com.heartsphere.entity.World;
import com.heartsphere.repository.UserRepository;
import com.heartsphere.repository.WorldRepository;
import com.heartsphere.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/worlds")
public class WorldController {

    @Autowired
    private WorldRepository worldRepository;

    @Autowired
    private UserRepository userRepository;

    // 获取当前用户的所有世界
    @GetMapping
    public ResponseEntity<List<World>> getAllWorlds() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<World> worlds = worldRepository.findByUserId(userDetails.getId());
        return ResponseEntity.ok(worlds);
    }

    // 获取指定ID的世界
    @GetMapping("/{id}")
    public ResponseEntity<World> getWorldById(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        World world = worldRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("World not found with id: " + id));

        // 确保用户只能访问自己的世界
        if (!world.getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(world);
    }

    // 创建新的世界
    @PostMapping
    public ResponseEntity<World> createWorld(@RequestBody World world) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userDetails.getId()));

        world.setUser(user);
        World savedWorld = worldRepository.save(world);
        return ResponseEntity.ok(savedWorld);
    }

    // 更新指定ID的世界
    @PutMapping("/{id}")
    public ResponseEntity<World> updateWorld(@PathVariable Long id, @RequestBody World worldDetails) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        World world = worldRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("World not found with id: " + id));

        // 确保用户只能更新自己的世界
        if (!world.getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).build();
        }

        world.setName(worldDetails.getName());
        world.setDescription(worldDetails.getDescription());

        World updatedWorld = worldRepository.save(world);
        return ResponseEntity.ok(updatedWorld);
    }

    // 删除指定ID的世界
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorld(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        World world = worldRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("World not found with id: " + id));

        // 确保用户只能删除自己的世界
        if (!world.getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).build();
        }

        worldRepository.delete(world);
        return ResponseEntity.noContent().build();
    }
}