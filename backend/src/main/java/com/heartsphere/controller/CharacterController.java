package com.heartsphere.controller;

import com.heartsphere.entity.Character;
import com.heartsphere.entity.User;
import com.heartsphere.repository.CharacterRepository;
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
@RequestMapping("/api/characters")
public class CharacterController {

    @Autowired
    private CharacterRepository characterRepository;

    @Autowired
    private UserRepository userRepository;

    // 获取当前用户的所有角色
    @GetMapping
    public ResponseEntity<List<Character>> getAllCharacters() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<Character> characters = characterRepository.findByUserId(userDetails.getId());
        return ResponseEntity.ok(characters);
    }

    // 获取指定ID的角色
    @GetMapping("/{id}")
    public ResponseEntity<Character> getCharacterById(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        Character character = characterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Character not found with id: " + id));

        // 确保用户只能访问自己的角色
        if (!character.getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(character);
    }

    // 获取指定世界的所有角色
    @GetMapping("/world/{worldId}")
    public ResponseEntity<List<Character>> getCharactersByWorldId(@PathVariable Long worldId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<Character> characters = characterRepository.findByWorldId(worldId);
        // 过滤出当前用户的角色
        characters = characters.stream().filter(character -> character.getUser().getId().equals(userDetails.getId())).toList();
        return ResponseEntity.ok(characters);
    }

    // 获取指定时代的所有角色
    @GetMapping("/era/{eraId}")
    public ResponseEntity<List<Character>> getCharactersByEraId(@PathVariable Long eraId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<Character> characters = characterRepository.findByEraId(eraId);
        // 过滤出当前用户的角色
        characters = characters.stream().filter(character -> character.getUser().getId().equals(userDetails.getId())).toList();
        return ResponseEntity.ok(characters);
    }

    // 创建新角色
    @PostMapping
    public ResponseEntity<Character> createCharacter(@RequestBody Character character) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userDetails.getId()));

        character.setUser(user);
        Character savedCharacter = characterRepository.save(character);
        return ResponseEntity.ok(savedCharacter);
    }

    // 更新指定ID的角色
    @PutMapping("/{id}")
    public ResponseEntity<Character> updateCharacter(@PathVariable Long id, @RequestBody Character characterDetails) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        Character character = characterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Character not found with id: " + id));

        // 确保用户只能更新自己的角色
        if (!character.getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).build();
        }

        character.setName(characterDetails.getName());
        character.setDescription(characterDetails.getDescription());
        character.setAge(characterDetails.getAge());
        character.setGender(characterDetails.getGender());
        character.setWorld(characterDetails.getWorld());
        character.setEra(characterDetails.getEra());

        Character updatedCharacter = characterRepository.save(character);
        return ResponseEntity.ok(updatedCharacter);
    }

    // 删除指定ID的角色
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCharacter(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        Character character = characterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Character not found with id: " + id));

        // 确保用户只能删除自己的角色
        if (!character.getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).build();
        }

        characterRepository.delete(character);
        return ResponseEntity.noContent().build();
    }
}