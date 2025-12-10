package com.heartsphere.repository;

import com.heartsphere.entity.Era;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EraRepository extends JpaRepository<Era, Long> {
    List<Era> findByUserId(Long userId);
    List<Era> findByWorldId(Long worldId);
}