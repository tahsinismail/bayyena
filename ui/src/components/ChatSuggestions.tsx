"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiService } from "@/services/api";
import { MdRefresh } from "react-icons/md";

interface ChatSuggestionsProps {
  onSuggestionClick: (suggestion: string) => void;
}

export function ChatSuggestions({ onSuggestionClick }: ChatSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { currentWorkspace, currentChat } = useApp();
  const { language, t, dir } = useLanguage();

  const loadSuggestions = async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    setError(null);

    try {
      const caseId = parseInt(currentWorkspace.id);
      const topicId = currentChat?.topicId;
      
      const newSuggestions = await apiService.getChatSuggestions(caseId, topicId, language);
      setSuggestions(newSuggestions);
    } catch (err) {
      console.error('Failed to load suggestions:', err);
      setError('Failed to load suggestions');
      
      // Set localized fallback suggestions based on context
      const hasDocuments = currentWorkspace?.documents && currentWorkspace.documents.length > 0;
      const hasConversation = currentChat?.messages && currentChat.messages.length > 0;
      
      let fallbackSuggestions: string[];
      
      // Use hardcoded fallbacks based on language and context
      
      if (hasDocuments) {
        fallbackSuggestions = language === 'ar'
          ? [
              "ما هي القضايا القانونية الرئيسية في مستنداتي؟",
              "لخص النقاط الرئيسية من ملفات قضيتي",
              "ما هي خطواتي القانونية التالية؟",
              "هل هناك أي مسائل امتثال يجب معالجتها؟"
            ]
          : [
              "What are the key legal issues in my documents?",
              "Summarize the main points from my case files",
              "What should be my next legal steps?",
              "Are there any compliance issues to address?"
            ];
      } else if (hasConversation) {
        fallbackSuggestions = language === 'ar'
          ? [
              "هل يمكنك شرح هذه النقطة بمزيد من التفصيل؟",
              "ما هي الخطوات العملية التي يجب أن أتبعها؟",
              "هل هناك أي مخاطر قانونية يجب مراعاتها؟",
              "ما هي البدائل المتاحة في هذه الحالة؟"
            ]
          : [
              "Can you explain this point in more detail?",
              "What are the practical steps I should follow?",
              "Are there any legal risks to consider?",
              "What alternatives are available in this case?"
            ];
      } else {
        fallbackSuggestions = language === 'ar'
          ? [
              "كيف يمكنك مساعدتي كمساعد قانوني؟",
              "ما أنواع الأسئلة القانونية التي يمكنني طرحها عليك؟",
              "هل يمكنك شرح مفهوم قانوني محدد؟",
              "ما هي أفضل الممارسات في إدارة القضايا القانونية؟"
            ]
          : [
              "How can you help me as a legal assistant?",
              "What types of legal questions can I ask you?",
              "Can you explain a specific legal concept?",
              "What are best practices in legal case management?"
            ];
      }
      
      setSuggestions(fallbackSuggestions);
    } finally {
      setLoading(false);
    }
  };

  // Load suggestions when workspace or chat changes
  useEffect(() => {
    loadSuggestions();
  }, [currentWorkspace?.id, currentChat?.id, currentChat?.messages?.length]);

  // Don't show suggestions if there are no suggestions or if loading
  if (!suggestions.length && !loading) {
    return null;
  }

  const getUITextClasses = () => {
    return language === 'ar' ? 'text-arabic' : 'text-english';
  };

  const getSuggestionTextClasses = (suggestion: string) => {
    // Detect if the suggestion text contains Arabic characters
    const arabicRegex = /[\u0600-\u06FF]/;
    const isArabicContent = arabicRegex.test(suggestion);
    return isArabicContent ? 'text-arabic' : 'text-english';
  };

  return (
    <div className="border-b border-border bg-card/50 p-2 sm:p-3" dir={dir}>
      <div className="max-w-4xl mx-auto">
        <div className={`flex items-center justify-between mb-2 gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <div className={`text-sm text-muted-foreground flex-1 min-w-0 ${getUITextClasses()}`}>
            <span className="truncate block">{t('chat.suggestions.title', 'Suggested questions')}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadSuggestions}
            disabled={loading}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
            title={t('chat.suggestions.refresh', 'Refresh suggestions')}
          >
            <MdRefresh className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-2">
            <div className="animate-pulse text-xs sm:text-sm text-muted-foreground">
              {t('chat.suggestions.loading', 'Loading suggestions...')}
            </div>
          </div>
        ) : error ? (
          <div className="text-xs sm:text-sm text-red-500 break-words">
            {t('chat.suggestions.error', 'Failed to load suggestions')}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => {
              const isArabicContent = /[\u0600-\u06FF]/.test(suggestion);
              return (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onSuggestionClick(suggestion)}
                  className={`
                    text-xs h-auto min-h-[2rem] px-3 py-2 bg-background hover:bg-muted border-border 
                    text-foreground hover:text-foreground transition-colors
                    flex-shrink-0 whitespace-normal text-left leading-relaxed
                    max-w-full sm:max-w-[200px] md:max-w-[250px] lg:max-w-[300px]
                    ${isArabicContent ? 'text-arabic' : 'text-english'}
                  `}
                  dir={isArabicContent ? 'rtl' : 'ltr'}
                >
                  {suggestion}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
