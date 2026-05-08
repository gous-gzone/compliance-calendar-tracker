package com.example.tool.repository;

import com.example.tool.entity.Compliance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ComplianceRepository extends JpaRepository<Compliance, Long> {

    // Paginated list — active records only
    Page<Compliance> findByIsDeletedFalse(Pageable pageable);

    // Single active record
    Optional<Compliance> findByIdAndIsDeletedFalse(Long id);

    // Existence check on active records
    boolean existsByIdAndIsDeletedFalse(Long id);

    // Status counts — active records only
    long countByStatusAndIsDeletedFalse(String status);

    long countByIsDeletedFalse();

    // Case-insensitive search on title OR description — active records only
    @Query("""
            SELECT c FROM Compliance c
            WHERE c.isDeleted = false
              AND (LOWER(c.title)       LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.description) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    List<Compliance> search(@Param("q") String q);

    // Scheduler: find active records with due date in range
    List<Compliance> findByIsDeletedFalseAndDueDateBetween(LocalDate start, LocalDate end);

    // Legacy — kept for backward compat
    List<Compliance> findByStatus(String status);
}
