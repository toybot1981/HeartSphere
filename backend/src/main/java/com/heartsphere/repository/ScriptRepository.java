package com.heartsphere.repository;

import com.heartsphere.entity.Script;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScriptRepository extends JpaRepository<Script, Long> {
    List<Script> findByUserId(Long userId);
    List<Script> findByWorldId(Long worldId);
    List<Script> findByEraId(Long eraId);
}