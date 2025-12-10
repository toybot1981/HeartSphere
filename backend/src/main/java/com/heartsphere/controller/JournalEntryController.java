package com.heartsphere.controller;

import com.heartsphere.entity.JournalEntry;
import com.heartsphere.entity.User;
import com.heartsphere.repository.JournalEntryRepository;
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
@RequestMapping("/api/journal-entries")
public class JournalEntryController {

    @Autowired
    private JournalEntryRepository journalEntryRepository;

    @Autowired
    private UserRepository userRepository;

    // 获取当前用户的所有记录
    @GetMapping
    public ResponseEntity<List<JournalEntry>> getAllJournalEntries() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<JournalEntry> journalEntries = journalEntryRepository.findByUserId(userDetails.getId());
        return ResponseEntity.ok(journalEntries);
    }

    // 获取指定ID的记录
    @GetMapping("/{id}")
    public ResponseEntity<JournalEntry> getJournalEntryById(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        JournalEntry journalEntry = journalEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("JournalEntry not found with id: " + id));

        // 确保用户只能访问自己的记录
        if (!journalEntry.getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(journalEntry);
    }

    // 创建新记录
    @PostMapping
    public ResponseEntity<JournalEntry> createJournalEntry(@RequestBody JournalEntry journalEntry) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userDetails.getId()));

        journalEntry.setUser(user);
        JournalEntry savedJournalEntry = journalEntryRepository.save(journalEntry);
        return ResponseEntity.ok(savedJournalEntry);
    }

    // 更新指定ID的记录
    @PutMapping("/{id}")
    public ResponseEntity<JournalEntry> updateJournalEntry(@PathVariable Long id, @RequestBody JournalEntry journalEntryDetails) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        JournalEntry journalEntry = journalEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("JournalEntry not found with id: " + id));

        // 确保用户只能更新自己的记录
        if (!journalEntry.getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).build();
        }

        journalEntry.setTitle(journalEntryDetails.getTitle());
        journalEntry.setContent(journalEntryDetails.getContent());
        journalEntry.setEntryDate(journalEntryDetails.getEntryDate());
        journalEntry.setWorld(journalEntryDetails.getWorld());
        journalEntry.setEra(journalEntryDetails.getEra());
        journalEntry.setCharacter(journalEntryDetails.getCharacter());

        JournalEntry updatedJournalEntry = journalEntryRepository.save(journalEntry);
        return ResponseEntity.ok(updatedJournalEntry);
    }

    // 删除指定ID的记录
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJournalEntry(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        JournalEntry journalEntry = journalEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("JournalEntry not found with id: " + id));

        // 确保用户只能删除自己的记录
        if (!journalEntry.getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).build();
        }

        journalEntryRepository.delete(journalEntry);
        return ResponseEntity.noContent().build();
    }
}