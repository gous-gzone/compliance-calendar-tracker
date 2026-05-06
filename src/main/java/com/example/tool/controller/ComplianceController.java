package com.example.tool.controller;

import com.example.tool.dto.ComplianceRequest;
import com.example.tool.entity.Compliance;
import com.example.tool.service.ComplianceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/compliance")
@CrossOrigin(origins = "*")
public class ComplianceController {

    private final ComplianceService complianceService;

    public ComplianceController(ComplianceService complianceService) {
        this.complianceService = complianceService;
    }

    @GetMapping
    public List<Compliance> getAll() {
        return complianceService.getAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Compliance create(@Valid @RequestBody ComplianceRequest request) {
        return complianceService.create(request);
    }

    @PutMapping("/{id}")
    public Compliance update(@PathVariable Long id, @Valid @RequestBody ComplianceRequest request) {
        return complianceService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        complianceService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public List<Compliance> search(@RequestParam String q) {
        return complianceService.search(q);
    }

    @GetMapping("/stats")
    public Map<String, Long> stats() {
        return complianceService.getStats();
    }

    @GetMapping(value = "/export", produces = "text/csv")
    public ResponseEntity<byte[]> exportCsv() {
        StringBuilder csv = new StringBuilder();
        csv.append("ID,Title,Status,Priority,DueDate\n");
        for (Compliance c : complianceService.getAll()) {
            csv.append(c.getId()).append(",")
               .append(c.getTitle() != null ? c.getTitle().replace(",", " ") : "").append(",")
               .append(c.getStatus()).append(",")
               .append(c.getPriority()).append(",")
               .append(c.getDueDate()).append("\n");
        }
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"compliance_export.csv\"")
                .body(csv.toString().getBytes());
    }

    @PostMapping("/{id}/analyse")
    public Map<String, String> analyse(@PathVariable Long id) {
        Compliance c = complianceService.getById(id);
        return Map.of(
            "analysis", "AI Analysis for: " + c.getTitle(),
            "recommendation", "Action required based on criticality: " + c.getPriority()
        );
    }
}

