package com.heartsphere.repository;

import com.heartsphere.entity.EraMemory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EraMemoryRepository extends JpaRepository<EraMemory, String> {
}
