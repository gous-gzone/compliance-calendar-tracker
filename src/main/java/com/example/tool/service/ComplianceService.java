package com.example.tool.service;

import com.example.tool.dto.ComplianceRequest;
import com.example.tool.entity.Compliance;
import com.example.tool.exception.InvalidDataException;
import com.example.tool.exception.ResourceNotFoundException;
import com.example.tool.repository.ComplianceRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class ComplianceService {

    private final ComplianceRepository complianceRepository;
    private final EmailService emailService;

    public ComplianceService(ComplianceRepository complianceRepository) {
        this.complianceRepository = complianceRepository;
    }

    public List<Compliance> getAll() {
        return complianceRepository.findAll();
    }

    @Cacheable(value = "complianceRecords",
            key = "#pageable.pageNumber + '-' + #pageable.pageSize + '-' + #pageable.sort",
            unless = "#result == null")
    public Page<Compliance> getAllRecords(Pageable pageable) {
        log.info("Cache MISS - fetching complianceRecords from DB for page: {}", pageable.getPageNumber());
        return complianceRepository.findByIsDeletedFalse(pageable);
    }

    public Compliance create(ComplianceRequest request) {
        Compliance compliance = new Compliance();
        compliance.setTitle(request.getTitle());
        compliance.setDescription(request.getDescription());
        compliance.setStatus(request.getStatus());
        compliance.setPriority(request.getPriority());
        compliance.setDueDate(request.getDueDate());
        return complianceRepository.save(compliance);
    }

    public Compliance update(Long id, ComplianceRequest request) {
        Compliance existing = getById(id);
        existing.setTitle(request.getTitle());
        existing.setDescription(request.getDescription());
        existing.setStatus(request.getStatus());
        existing.setPriority(request.getPriority());
        existing.setDueDate(request.getDueDate());
        return complianceRepository.save(existing);
    }

    @Caching(evict = {
            @CacheEvict(value = "complianceRecords", allEntries = true),
            @CacheEvict(value = "complianceById",    key = "#id")
    })
    public void deleteRecord(Long id) {
        Compliance c = complianceRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Compliance record not found with id: " + id));
        c.setDeleted(true);
        complianceRepository.save(c);
        log.info("Compliance record soft-deleted with id: {}", id);
    }

    public List<Compliance> search(String keyword) {
        return complianceRepository.search(keyword);
    }

    public Map<String, Long> getStats() {
        return Map.of(
                "total",     complianceRepository.countByIsDeletedFalse(),
                "pending",   complianceRepository.countByStatusAndIsDeletedFalse("PENDING"),
                "completed", complianceRepository.countByStatusAndIsDeletedFalse("COMPLETED"),
                "overdue",   complianceRepository.countByStatusAndIsDeletedFalse("OVERDUE"),
                "open",      complianceRepository.countByStatusAndIsDeletedFalse("OPEN"),
                "closed",    complianceRepository.countByStatusAndIsDeletedFalse("CLOSED")
        );
    }

    private void validate(ComplianceRequest r) {
        if (r.getTitle() == null || r.getTitle().isBlank())
            throw new InvalidDataException("Title must not be empty");
        if (r.getDueDate() != null && r.getDueDate().isBefore(LocalDate.now()))
            throw new InvalidDataException("Due date must not be in the past");
    }
}
