package com.example.tool.service;

import com.example.tool.dto.ComplianceRequest;
import com.example.tool.entity.Compliance;
import com.example.tool.exception.ComplianceNotFoundException;
import com.example.tool.repository.ComplianceRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ComplianceService {

    private final ComplianceRepository complianceRepository;

    public ComplianceService(ComplianceRepository complianceRepository) {
        this.complianceRepository = complianceRepository;
    }

    public List<Compliance> getAll() {
        return complianceRepository.findAll();
    }

    public Compliance getById(Long id) {
        return complianceRepository.findById(id)
                .orElseThrow(() -> new ComplianceNotFoundException(id));
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

    public void delete(Long id) {
        if (!complianceRepository.existsById(id)) {
            throw new ComplianceNotFoundException(id);
        }
        complianceRepository.deleteById(id);
    }

    public List<Compliance> search(String keyword) {
        return complianceRepository.searchByTitle(keyword);
    }

    public Map<String, Long> getStats() {
        Map<String, Long> stats = new HashMap<>();
        stats.put("total", complianceRepository.count());
        stats.put("pending", (long) complianceRepository.findByStatus("PENDING").size());
        stats.put("completed", (long) complianceRepository.findByStatus("COMPLETED").size());
        stats.put("overdue", (long) complianceRepository.findByStatus("OVERDUE").size());
        return stats;
    }
}
