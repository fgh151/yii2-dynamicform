<?php

namespace fgh151\dynamicform;

use DOMDocument;
use Symfony\Component\DomCrawler\Crawler;
use Yii;
use yii\base\InvalidConfigException;
use yii\base\Model;
use yii\base\Widget;
use yii\db\ActiveRecord;
use yii\helpers\Html;
use yii\helpers\Json;
use yii\web\View;

/**
 */
class DynamicFormWidget extends Widget
{
    const WIDGET_NAME = 'dynamicform';
    /**
     * @var string
     */
    public string $widgetContainer;
     /**
     * @var string
     */
    public string $widgetBody;
    /**
     * @var string
     */
    public string $widgetItem;
    /**
     * @var integer
     */
    public int $limit = 999;
    /**
     * @var string
     */
    public string $insertButton;
     /**
     * @var string
     */
    public string $deleteButton;
    /**
     * @var string 'bottom' or 'top';
     */
    public string $insertPosition = 'bottom';
     /**
     * @var Model|ActiveRecord the model used for the form
     */
    public $model;
    /**
     * @var string form ID
     */
    public string $formId;
    /**
     * @var array fields to be validated.
     */
    public array $formFields;
    /**
     * @var integer
     */
    public int $min = 1;
    /**
     * @var array
     */
    private array $_options;
    /**
     * @var array
     */
    private array $_insertPositions = ['bottom', 'top'];
    /**
     * @var string the hashed global variable name storing the pluginOptions.
     */
    private string $_hashVar;
    /**
     * @var string the Json encoded options.
     */
    private string $_encodedOptions = '';

    /**
     * Initializes the widget.
     *
     * @throws InvalidConfigException
     */
    public function init()
    {
        parent::init();

        if (empty($this->widgetContainer) || (preg_match('/^\w{1,}$/', $this->widgetContainer) === 0)) {
            throw new InvalidConfigException('Invalid configuration to property "widgetContainer". 
                Allowed only alphanumeric characters plus underline: [A-Za-z0-9_]');
        }
        if (empty($this->widgetBody)) {
            throw new InvalidConfigException("The 'widgetBody' property must be set.");
        }
        if (empty($this->widgetItem)) {
            throw new InvalidConfigException("The 'widgetItem' property must be set.");
        }
        if (empty($this->model) || !$this->model instanceof Model) {
            throw new InvalidConfigException("The 'model' property must be set and must extend from '\\yii\\base\\Model'.");
        }
        if (empty($this->formId)) {
            throw new InvalidConfigException("The 'formId' property must be set.");
        }
        if (empty($this->insertPosition) || ! in_array($this->insertPosition, $this->_insertPositions)) {
            throw new InvalidConfigException("Invalid configuration to property 'insertPosition' (allowed values: 'bottom' or 'top')");
        }
        if (empty($this->formFields) || !is_array($this->formFields)) {
            throw new InvalidConfigException("The 'formFields' property must be set.");
        }

        $this->initOptions();
    }

    /**
     * Initializes the widget options.
     */
    protected function initOptions(): void
    {
        $this->_options['widgetContainer'] = $this->widgetContainer;
        $this->_options['widgetBody']      = $this->widgetBody;
        $this->_options['widgetItem']      = $this->widgetItem;
        $this->_options['limit']           = $this->limit;
        $this->_options['insertButton']    = $this->insertButton;
        $this->_options['deleteButton']    = $this->deleteButton;
        $this->_options['insertPosition']  = $this->insertPosition;
        $this->_options['formId']          = $this->formId;
        $this->_options['min']             = $this->min;
        $this->_options['fields']          = [];

        foreach ($this->formFields as $field) {
             $this->_options['fields'][] = [
                'id' => Html::getInputId($this->model, '[{}]' . $field),
                'name' => Html::getInputName($this->model, '[{}]' . $field)
            ];
        }

        ob_start();
        ob_implicit_flush(false);
    }

    /**
     * Registers plugin options by storing it in a hashed javascript variable.
     *
     * @param View $view The View object
     */
    protected function registerOptions(View $view): void
    {
        $view->registerJs("var $this->_hashVar = $this->_encodedOptions;\n", $view::POS_HEAD);
    }

    /**
     * Generates a hashed variable to store the options.
     */
    protected function hashOptions(): void
    {
        $this->_encodedOptions = Json::encode($this->_options);
        $this->_hashVar = self::WIDGET_NAME . '_' . hash('crc32', $this->_encodedOptions);
    }

    /**
     * Returns the hashed variable.
     *
     * @return string
     */
    protected function getHashVarName(): string
    {
        if (isset(Yii::$app->params[self::WIDGET_NAME][$this->widgetContainer])) {
            return Yii::$app->params[self::WIDGET_NAME][$this->widgetContainer];
        }

        return $this->_hashVar;
    }

    /**
     * Register the actual widget.
     *
     * @return boolean
     */
    public function registerHashVarWidget(): bool
    {
        if (!isset(Yii::$app->params[self::WIDGET_NAME][$this->widgetContainer])) {
            Yii::$app->params[self::WIDGET_NAME][$this->widgetContainer] = $this->_hashVar;
            return true;
        }

        return false;
    }

    /**
     * Registers the needed assets.
     *
     * @param View $view The View object
     */
    public function registerAssets(View $view): void
    {
        // add a click handler for the clone button
        $js = 'jQuery("#' . $this->formId . '").on("click", "' . $this->insertButton . '", function(e) {'. "\n";
        $js .= "    e.preventDefault();\n";
        $js .= '    jQuery(".' .  $this->widgetContainer . '").triggerHandler("beforeInsert", [jQuery(this)]);' . "\n";
        $js .= '    jQuery(".' .  $this->widgetContainer . '").yiiDynamicForm("addItem", '. $this->_hashVar . ", e, jQuery(this));\n";
        $js .= "});\n";
        $view->registerJs($js);

        // add a click handler for the remove button
        $js = 'jQuery("#' . $this->formId . '").on("click", "' . $this->deleteButton . '", function(e) {'. "\n";
        $js .= "    e.preventDefault();\n";
        $js .= '    jQuery(".' .  $this->widgetContainer . '").yiiDynamicForm("deleteItem", '. $this->_hashVar . ", e, jQuery(this));\n";
        $js .= "});\n";
        $view->registerJs($js);

        $js = 'jQuery("#' . $this->formId . '").yiiDynamicForm(' . $this->_hashVar .');' . "\n";
        $view->registerJs($js, $view::POS_LOAD);
    }

    /**
     * @inheritdoc
     */
    public function run()
    {
        $content = ob_get_clean();
        $crawler = new Crawler($content);
        $results = $crawler->filter($this->widgetItem);
        $document = new DOMDocument('1.0', Yii::$app->charset);
        $document->appendChild($document->importNode($results->first()->getNode(0), true));
        $this->_options['template'] = trim($document->saveHTML());

        if (isset($this->_options['min']) && $this->_options['min'] === 0 && $this->model->isNewRecord) {
            $content = $this->removeItems($content);
        }

        $this->hashOptions();
        $view = $this->getView();
        $widgetRegistered = $this->registerHashVarWidget();
        $this->_hashVar = $this->getHashVarName();

        if ($widgetRegistered) {
            $this->registerOptions($view);
            $this->registerAssets($view);
        }

        echo Html::tag('div', $content, ['class' => $this->widgetContainer, 'data-dynamicform' => $this->_hashVar]);
    }

    private function removeItems(bool|string $content)
    {
        $crawler = new Crawler();
        $crawler->addHTMLContent($content, \Yii::$app->charset);
        $crawler->filter($this->widgetItem)->each(function ($nodes) {
            foreach ($nodes as $node) {
                $node->parentNode->removeChild($node);
            }
        });

        return $crawler->html();
    }
}
