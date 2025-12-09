package com.heartsphere.repository;

import com.heartsphere.entity.WorldScene;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorldSceneRepository extends JpaRepository<WorldScene, String> {
}
