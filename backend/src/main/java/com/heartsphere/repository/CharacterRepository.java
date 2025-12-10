package com.heartsphere.repository;

import com.heartsphere.entity.Character;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CharacterRepository extends JpaRepository<Character, Long> {
    List<Character> findByUserId(Long userId);
    List<Character> findByWorldId(Long worldId);
    List<Character> findByEraId(Long eraId);
}