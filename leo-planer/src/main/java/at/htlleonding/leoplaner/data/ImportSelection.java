package at.htlleonding.leoplaner.data;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * The files of one import, each with the type it was recognized as, and
 * whether they form something that can be imported: one Excel file alone, or
 * the school data (SQL export + GPU006 + GPU002, the wishes are optional).
 *
 * The check only looks at the combination, it never writes anything. Its
 * messages name the files and what is missing, so a correct file is never
 * reported as broken just because another one is missing.
 */
public final class ImportSelection {

    public enum Kind {
        EXCEL, SCHOOL_DATA
    }

    public record NamedFile(String name, byte[] content) {
    }

    public record DetectedFile(String name, ImportFileType type, byte[] content) {
    }

    private static final Set<ImportFileType> REQUIRED_SCHOOL_FILES = EnumSet.of(
            ImportFileType.TIMETABLE_EXPORT, ImportFileType.GPU_SUBJECTS, ImportFileType.GPU_LESSONS);

    private static final String ALLOWED = "Erlaubt sind eine Excel-Datei aus LeoPlaner oder die Schuldaten: "
            + "Stundenplan-Export (.sql), Untis GPU006 und GPU002, optional die Lehrerwünsche (.json).";

    private final List<DetectedFile> files;
    private final Kind kind;
    private final String error;

    private ImportSelection(final List<DetectedFile> files, final Kind kind, final String error) {
        this.files = files;
        this.kind = kind;
        this.error = error;
    }

    public static ImportSelection check(final List<NamedFile> uploaded) {
        final List<DetectedFile> files = uploaded.stream()
                .map(f -> new DetectedFile(f.name(), ImportFileType.detect(f.content()), f.content()))
                .toList();

        if (files.isEmpty()) {
            return invalid(files, "Keine Datei ausgewählt.");
        }

        final List<String> unknown = files.stream()
                .filter(f -> f.type() == ImportFileType.UNKNOWN)
                .map(f -> quote(f.name()))
                .toList();
        if (!unknown.isEmpty()) {
            return invalid(files, "Nicht erkannt: " + String.join(", ", unknown) + ". " + ALLOWED);
        }

        final Map<ImportFileType, List<String>> namesByType = new LinkedHashMap<>();
        for (final DetectedFile file : files) {
            namesByType.computeIfAbsent(file.type(), t -> new ArrayList<>()).add(quote(file.name()));
        }
        for (final Map.Entry<ImportFileType, List<String>> entry : namesByType.entrySet()) {
            if (entry.getValue().size() > 1) {
                return invalid(files, String.join(" und ", entry.getValue()) + " sind beide "
                        + entry.getKey().getLabel() + ". Bitte jede Datei nur einmal auswählen.");
            }
        }

        if (namesByType.containsKey(ImportFileType.EXCEL)) {
            if (files.size() > 1) {
                return invalid(files, "Bitte entweder die Excel-Datei oder die Schuldaten-Dateien auswählen, "
                        + "nicht beides gleichzeitig.");
            }
            return new ImportSelection(files, Kind.EXCEL, null);
        }

        final String missing = REQUIRED_SCHOOL_FILES.stream()
                .filter(type -> !namesByType.containsKey(type))
                .map(ImportFileType::getLabel)
                .collect(Collectors.joining(", "));
        if (!missing.isEmpty()) {
            return invalid(files, "Für die Schuldaten fehlt noch: " + missing
                    + ". Bitte alle Dateien gemeinsam auswählen.");
        }
        return new ImportSelection(files, Kind.SCHOOL_DATA, null);
    }

    private static ImportSelection invalid(final List<DetectedFile> files, final String error) {
        return new ImportSelection(files, null, error);
    }

    private static String quote(final String name) {
        return "„" + (name == null || name.isBlank() ? "ohne Namen" : name) + "“";
    }

    public boolean isValid() {
        return error == null;
    }

    /** The German message why the files can't be imported, null when they can. */
    public String getError() {
        return error;
    }

    /** EXCEL or SCHOOL_DATA, null when the selection is not valid. */
    public Kind getKind() {
        return kind;
    }

    public List<DetectedFile> getFiles() {
        return files;
    }

    /** The content of the file of that type, null when none was uploaded. */
    public byte[] content(final ImportFileType type) {
        return files.stream()
                .filter(f -> f.type() == type)
                .map(DetectedFile::content)
                .findFirst()
                .orElse(null);
    }
}
