package com.heartsphere.repository;

import com.heartsphere.entity.JournalEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JournalEntryRepository extends JpaRepository<JournalEntry, Long> {
    List<JournalEntry> findByUserId(Long userId);
    List<JournalEntry> findByWorldId(Long worldId);
    List<JournalEntry> findByEraId(Long eraId);
    List<JournalEntry> findByCharacterId(Long characterId);
}