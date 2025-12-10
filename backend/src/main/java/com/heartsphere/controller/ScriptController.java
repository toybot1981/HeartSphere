package com.heartsphere.controller;

import com.heartsphere.entity.Script;
import com.heartsphere.entity.User;
import com.heartsphere.repository.ScriptRepository;
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
@RequestMapping("/api/scripts")
public class ScriptController {

    @Autowired
    private ScriptRepository scriptRepository;

    @Autowired
    private UserRepository userRepository;

    // 获取当前用户的所有剧本
    @GetMapping
    public ResponseEntity<List<Script>> getAllScripts() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<Script> scripts = scriptRepository.findByUserId(userDetails.getId());
        return ResponseEntity.ok(scripts);
    }

    // 获取指定ID的剧本
    @GetMapping("/{id}")
    public ResponseEntity<Script> getScriptById(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        Script script = scriptRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Script not found with id: " + id));

        // 确保用户只能访问自己的剧本
        if (!script.getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(script);
    }

    // 获取指定世界的所有剧本
    @GetMapping("/world/{worldId}")
    public ResponseEntity<List<Script>> getScriptsByWorldId(@PathVariable Long worldId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<Script> scripts = scriptRepository.findByWorldId(worldId);
        // 过滤出当前用户的剧本
        scripts = scripts.stream().filter(script -> script.getUser().getId().equals(userDetails.getId())).toList();
        return ResponseEntity.ok(scripts);
    }

    // 获取指定时代的所有剧本
    @GetMapping("/era/{eraId}")
    public ResponseEntity<List<Script>> getScriptsByEraId(@PathVariable Long eraId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<Script> scripts = scriptRepository.findByEraId(eraId);
        // 过滤出当前用户的剧本
        scripts = scripts.stream().filter(script -> script.getUser().getId().equals(userDetails.getId())).toList();
        return ResponseEntity.ok(scripts);
    }

    // 创建新剧本
    @PostMapping
    public ResponseEntity<Script> createScript(@RequestBody Script script) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userDetails.getId()));

        script.setUser(user);
        Script savedScript = scriptRepository.save(script);
        return ResponseEntity.ok(savedScript);
    }

    // 更新指定ID的剧本
    @PutMapping("/{id}")
    public ResponseEntity<Script> updateScript(@PathVariable Long id, @RequestBody Script scriptDetails) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        Script script = scriptRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Script not found with id: " + id));

        // 确保用户只能更新自己的剧本
        if (!script.getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).build();
        }

        script.setTitle(scriptDetails.getTitle());
        script.setContent(scriptDetails.getContent());
        script.setSceneCount(scriptDetails.getSceneCount());
        script.setWorld(scriptDetails.getWorld());
        script.setEra(scriptDetails.getEra());

        Script updatedScript = scriptRepository.save(script);
        return ResponseEntity.ok(updatedScript);
    }

    // 删除指定ID的剧本
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteScript(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        Script script = scriptRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Script not found with id: " + id));

        // 确保用户只能删除自己的剧本
        if (!script.getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).build();
        }

        scriptRepository.delete(script);
        return ResponseEntity.noContent().build();
    }
}