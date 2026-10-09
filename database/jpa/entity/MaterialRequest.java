package com.buildup.material.entity;

import com.buildup.site.entity.Site;
import com.buildup.user.entity.User;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Entity
@Table(name = "material_requests")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MaterialRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "site_id", nullable = false)
    private Site site;

    @Column(name = "process_key", nullable = false, length = 50)
    private String processKey;

    @Column(name = "process_name", nullable = false, length = 100)
    private String processName;

    @Column(name = "needed_by")
    private LocalDate neededBy;

    @Column(nullable = false)
    private boolean urgent;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private MaterialRequestStatus status;

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "material_request_items",
            joinColumns = @JoinColumn(name = "request_id"),
            uniqueConstraints = @UniqueConstraint(
                    name = "uq_material_request_items_request_position",
                    columnNames = {"request_id", "position"}
            )
    )
    @OrderColumn(name = "position", nullable = false)
    private List<MaterialRequestItem> items = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "material_request_events",
            joinColumns = @JoinColumn(name = "request_id"),
            uniqueConstraints = @UniqueConstraint(
                    name = "uq_material_request_events_request_position",
                    columnNames = {"request_id", "position"}
            )
    )
    @OrderColumn(name = "position", nullable = false)
    private List<MaterialRequestEvent> events = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private MaterialRequest(
            Site site,
            String processKey,
            String processName,
            LocalDate neededBy,
            boolean urgent,
            String note,
            User author,
            List<MaterialRequestItem> items,
            boolean requestedByHq,
            LocalDateTime requestedAt
    ) {
        this.site = site;
        this.processKey = processKey;
        this.processName = processName;
        this.neededBy = neededBy;
        this.urgent = urgent;
        this.note = note;
        this.status = MaterialRequestStatus.REQUESTED;
        this.author = author;
        this.items.addAll(items);
        this.events.add(new MaterialRequestEvent(
                MaterialRequestStatus.REQUESTED,
                author,
                requestedByHq,
                requestedAt
        ));
    }

    public static MaterialRequest submit(
            Site site,
            String processKey,
            String processName,
            LocalDate neededBy,
            boolean urgent,
            String note,
            User author,
            List<MaterialRequestItem> items,
            boolean requestedByHq,
            LocalDateTime requestedAt
    ) {
        return new MaterialRequest(
                site,
                processKey,
                processName,
                neededBy,
                urgent,
                note,
                author,
                items,
                requestedByHq,
                requestedAt
        );
    }

    public void transition(
            MaterialRequestStatus nextStatus,
            String rejectReason,
            User actor,
            boolean byHq,
            LocalDateTime changedAt
    ) {
        this.status = nextStatus;
        this.rejectReason = nextStatus == MaterialRequestStatus.REJECTED
                ? rejectReason
                : null;
        this.events.add(new MaterialRequestEvent(nextStatus, actor, byHq, changedAt));
    }
}
