package com.heartsphere.repository;

import com.heartsphere.entity.CustomScenario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CustomScenarioRepository extends JpaRepository<CustomScenario, String> {
}
